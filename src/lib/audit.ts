// src/lib/audit.ts
import { prisma } from "./prisma"

export async function audit(
  action: string,
  resource: string,
  options: {
    userId?: string
    resourceId?: string
    details?: Record<string, unknown>
    ipAddress?: string
  } = {}
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action,
        resource,
        resourceId: options.resourceId,
        details: options.details as object | undefined,
        ipAddress: options.ipAddress,
      },
    })
  } catch (e) {
    // Audit log failure should never break the main flow
    console.error("Audit log error:", e)
  }
}
