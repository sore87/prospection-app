import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Enrôle des prospects dans une campagne
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { prospectIds } = await req.json()
  const campaignId = params.id

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 })

  const enrolled: string[] = []
  const skipped: string[] = []

  for (const prospectId of prospectIds) {
    try {
      await prisma.campaignProspect.create({
        data: { campaignId, prospectId, status: "active" },
      })
      enrolled.push(prospectId)
    } catch {
      skipped.push(prospectId) // déjà enrôlé (contrainte unique)
    }
  }

  return NextResponse.json({ enrolled: enrolled.length, skipped: skipped.length })
}
