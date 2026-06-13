import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Liste les emails en attente de validation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")
  const status     = searchParams.get("status") || "pending"

  const emails = await prisma.email.findMany({
    where: {
      status,
      ...(campaignId ? { sequence: { campaignId } } : {}),
    },
    include: {
      sequence: { include: { campaign: true } },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  })

  // Enrichit avec les données prospect
  const enriched = await Promise.all(
    emails.map(async (email) => {
      const prospect = await prisma.prospect.findUnique({ where: { id: email.prospectId } })
      return { ...email, prospect }
    })
  )

  return NextResponse.json({ emails: enriched })
}

// Approuve ou rejette un ou plusieurs emails
export async function PATCH(req: NextRequest) {
  const { ids, action, editedBody, editedSubject } = await req.json()
  // action: "approve" | "reject"

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 })
  }

  await prisma.email.updateMany({
    where: { id: { in: ids } },
    data: {
      status:     action === "approve" ? "approved" : "rejected",
      approvedAt: action === "approve" ? new Date() : null,
      ...(editedBody    ? { body: editedBody }       : {}),
      ...(editedSubject ? { subject: editedSubject } : {}),
    },
  })

  return NextResponse.json({ success: true, updated: ids.length, action })
}
