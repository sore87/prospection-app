import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const [
    totalProspects,
    totalCampaigns,
    emailStats,
    recentEmails,
  ] = await Promise.all([
    prisma.prospect.count(),
    prisma.campaign.count(),
    prisma.email.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.email.findMany({
      where: { status: { in: ["sent", "pending", "approved"] } },
      orderBy: { generatedAt: "desc" },
      take: 10,
    }),
  ])

  const stats = {
    pending:  0,
    approved: 0,
    sent:     0,
    bounced:  0,
    replied:  0,
  }
  for (const s of emailStats) {
    if (s.status in stats) stats[s.status as keyof typeof stats] = s._count.status
  }

  return NextResponse.json({
    totalProspects,
    totalCampaigns,
    ...stats,
    recentEmails,
  })
}
