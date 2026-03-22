"use client"
// src/hooks/useAuth.ts
// React 19 compatible - uses native fetch with cache
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { SessionUser } from "@/types"

interface AuthState {
  user: SessionUser | null
  loading: boolean
}

// Module-level cache — survives React re-renders, cleared on logout
let cachedUser: SessionUser | null = null
let fetchPromise: Promise<SessionUser | null> | null = null

async function fetchUser(): Promise<SessionUser | null> {
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch("/api/auth/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      cachedUser = data?.user ?? null
      fetchPromise = null
      return cachedUser
    })
    .catch(() => {
      fetchPromise = null
      return null
    })
  return fetchPromise
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: cachedUser,
    loading: !cachedUser,
  })
  const router = useRouter()

  useEffect(() => {
    if (cachedUser) {
      setState({ user: cachedUser, loading: false })
      return
    }
    fetchUser().then((user) => {
      setState({ user, loading: false })
      if (!user) router.replace("/login")
    })
  }, [router])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    cachedUser = null
    fetchPromise = null
    setState({ user: null, loading: false })
    router.replace("/login")
  }, [router])

  const refresh = useCallback(async () => {
    cachedUser = null
    fetchPromise = null
    const user = await fetchUser()
    setState({ user, loading: false })
  }, [])

  return { ...state, logout, refresh }
}
