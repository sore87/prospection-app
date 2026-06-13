import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sequences: { orderBy: { stepNumber: "asc" } },
      _count: { select: { campaignProspects: true } },
    },
  })
  return NextResponse.json({ campaigns })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name, description,
    product, targetDescription, valueProposition,
    senderName, senderPosition, senderCompany,
    sequences, // array of { delayDays, subject (optionnel) }
  } = body

  if (!name || !product || !sequences?.length) {
    return NextResponse.json({ error: "Champs manquants : name, product, sequences" }, { status: 400 })
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      description,
      // Stocke les métadonnées dans description en JSON (simple pour commencer)
      sequences: {
        create: sequences.map((s: { delayDays: number }, i: number) => ({
          stepNumber: i + 1,
          delayDays: s.delayDays,
          subject: "",   // généré par Claude à l'envoi
          // On stocke le contexte produit dans le prompt de chaque séquence
          prompt: JSON.stringify({
            product,
            targetDescription,
            valueProposition,
            senderName,
            senderPosition,
            senderCompany,
            totalSteps: sequences.length,
          }),
        })),
      },
    },
    include: { sequences: true },
  })

  return NextResponse.json({ campaign })
}
