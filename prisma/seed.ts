// prisma/seed.ts  — Run: npm run db:seed
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@1234", 12)
  const recruiterPassword = await bcrypt.hash("Recruiter@1234", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@autohire.com" },
    update: {},
    create: { name: "Super Admin", email: "admin@autohire.com", password: adminPassword, role: "SUPER_ADMIN" },
  })

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@autohire.com" },
    update: {},
    create: { name: "Priya Sharma", email: "recruiter@autohire.com", password: recruiterPassword, role: "RECRUITER" },
  })

  const interviewerPassword = await bcrypt.hash("Interviewer@1234", 12)
  const interviewer = await prisma.user.upsert({
    where: { email: "interviewer@autohire.com" },
    update: {},
    create: { name: "Rahul Verma", email: "interviewer@autohire.com", password: interviewerPassword, role: "INTERVIEWER" },
  })

  console.log("✅ Users created")

  // ── Jobs ───────────────────────────────────────────────────────────────────
  const job1 = await prisma.job.upsert({
    where: { id: "job-frontend-001" },
    update: {},
    create: {
      id: "job-frontend-001",
      title: "Senior Frontend Engineer",
      department: "Engineering",
      location: "Bengaluru / Remote",
      type: "FULL_TIME",
      requiredSkills: ["react", "typescript", "next.js", "tailwind"],
      minExperience: 3,
      salaryMin: 1800000,
      salaryMax: 2800000,
      openings: 2,
      description: "Build high-performance UIs using React and Next.js",
    },
  })

  const job2 = await prisma.job.upsert({
    where: { id: "job-backend-001" },
    update: {},
    create: {
      id: "job-backend-001",
      title: "Backend Engineer (Node.js)",
      department: "Engineering",
      location: "Hyderabad",
      type: "FULL_TIME",
      requiredSkills: ["node.js", "postgresql", "docker", "aws"],
      minExperience: 2,
      salaryMin: 1500000,
      salaryMax: 2400000,
      openings: 3,
    },
  })

  console.log("✅ Jobs created")

  // ── Candidates ─────────────────────────────────────────────────────────────
  const candidates = [
    {
      name: "Arjun Mehta", email: "arjun.mehta@example.com", phone: "+91 98765 43210",
      location: "Bengaluru", currentRole: "Frontend Developer", currentCompany: "Razorpay",
      experienceYears: 4, expectedSalary: 2200000, noticePeriod: "30 days",
      skills: ["react", "typescript", "next.js", "tailwind", "graphql", "git"],
      status: "INTERVIEW" as const, callStatus: "CALLED" as const, source: "LINKEDIN" as const, priority: "HIGH" as const,
      technicalScore: 8.5, communicationScore: 7.5, cultureFitScore: 8.0, overallScore: 8.0,
      jobId: job1.id, createdById: recruiter.id,
    },
    {
      name: "Sneha Patel", email: "sneha.patel@example.com", phone: "+91 91234 56789",
      location: "Pune", currentRole: "Full Stack Developer", currentCompany: "Infosys",
      experienceYears: 3, expectedSalary: 1800000, noticePeriod: "60 days",
      skills: ["react", "node.js", "postgresql", "docker", "typescript"],
      status: "SHORTLISTED" as const, callStatus: "NOT_CALLED" as const, source: "NAUKRI" as const, priority: "HIGH" as const,
      technicalScore: 8.0, communicationScore: 8.5, overallScore: 8.2,
      jobId: job1.id, createdById: recruiter.id,
    },
    {
      name: "Karan Singh", email: "karan.singh@example.com", phone: "+91 70000 12345",
      location: "Mumbai", currentRole: "Backend Engineer", currentCompany: "Flipkart",
      experienceYears: 5, expectedSalary: 2500000, noticePeriod: "30 days",
      skills: ["python", "django", "postgresql", "redis", "aws", "docker", "kubernetes"],
      status: "SELECTED" as const, callStatus: "CALLED" as const, source: "REFERRAL" as const, priority: "URGENT" as const,
      technicalScore: 9.5, communicationScore: 8.0, cultureFitScore: 9.0, overallScore: 9.0,
      jobId: job2.id, createdById: recruiter.id, assignedToId: interviewer.id,
    },
    {
      name: "Divya Nair", email: "divya.nair@example.com",
      location: "Chennai", currentRole: "React Developer", currentCompany: "TCS",
      experienceYears: 2, expectedSalary: 1400000, noticePeriod: "90 days",
      skills: ["react", "javascript", "css", "html", "git"],
      status: "APPLIED" as const, callStatus: "NOT_CALLED" as const, source: "WEBSITE" as const, priority: "MEDIUM" as const,
      jobId: job1.id, createdById: admin.id,
    },
    {
      name: "Rohan Gupta", email: "rohan.gupta@example.com", phone: "+91 88888 77777",
      location: "Delhi", currentRole: "DevOps Engineer", currentCompany: "Wipro",
      experienceYears: 6, expectedSalary: 3000000, noticePeriod: "Immediate",
      skills: ["kubernetes", "docker", "aws", "terraform", "ci/cd", "linux", "ansible"],
      status: "OFFER" as const, callStatus: "CALLED" as const, source: "LINKEDIN" as const, priority: "URGENT" as const,
      technicalScore: 9.0, communicationScore: 7.5, overallScore: 8.5,
      jobId: job2.id, createdById: recruiter.id,
    },
    {
      name: "Meera Iyer", email: "meera.iyer@example.com",
      location: "Hyderabad", currentRole: "Junior Developer", currentCompany: "Cognizant",
      experienceYears: 1, expectedSalary: 900000, noticePeriod: "30 days",
      skills: ["javascript", "react", "html", "css"],
      status: "REJECTED" as const, callStatus: "NOT_PICKED" as const, source: "CAMPUS" as const, priority: "LOW" as const,
      technicalScore: 4.5, communicationScore: 5.0, overallScore: 4.8,
      jobId: job1.id, createdById: admin.id,
    },
    {
      name: "Aditya Kumar", email: "aditya.kumar@example.com", phone: "+91 99001 23456",
      location: "Bengaluru", currentRole: "ML Engineer", currentCompany: "Amazon",
      experienceYears: 5, expectedSalary: 3500000, noticePeriod: "60 days",
      skills: ["python", "tensorflow", "pytorch", "machine learning", "sql", "aws", "pandas"],
      status: "SCREENING" as const, callStatus: "SCHEDULED" as const, source: "DIRECT" as const, priority: "HIGH" as const,
      createdById: recruiter.id,
    },
  ]

  for (const c of candidates) {
    await prisma.candidate.upsert({
      where: { email: c.email },
      update: {},
      create: c,
    })
  }

  console.log("✅ Candidates created")
  console.log("\n🎉 Seed complete!\n")
  console.log("Login credentials:")
  console.log("  Super Admin  → admin@autohire.com        / Admin@1234")
  console.log("  Recruiter    → recruiter@autohire.com    / Recruiter@1234")
  console.log("  Interviewer  → interviewer@autohire.com  / Interviewer@1234")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
