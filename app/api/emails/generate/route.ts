import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateEmail } from "@/lib/claude"
import { generateEmailVariants } from "@/lib/email-patterns"

// Génère les emails pour tous les prospects dont c'est le jour d'envoi
export async function POST(req: NextRequest) {
  const { campaignId, autoApprove = false } = await req.json()

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      sequences: { orderBy: { stepNumber: "asc" } },
      campaignProspects: {
        where: { status: "active" },
        include: { prospect: true },
      },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 })

  const generated: string[] = []
  const errors: string[] = []

  for (const cp of campaign.campaignProspects) {
    const currentSequence = campaign.sequences.find(s => s.stepNumber === cp.currentStep + 1)
    if (!currentSequence) continue

    // Vérifie si l'email a déjà été généré pour cette étape
    const existing = await prisma.email.findFirst({
      where: { sequenceId: currentSequence.id, prospectId: cp.prospectId, status: { not: "bounced" } },
    })
    if (existing) continue

    const prospect = cp.prospect
    const context = JSON.parse(currentSequence.prompt)

    try {
      const { subject, body } = await generateEmail(
        {
          firstName:   prospect.firstName,
          lastName:    prospect.lastName,
          company:     prospect.company,
          position:    prospect.position || "",
          industry:    prospect.industry    || undefined,
          companySize: prospect.companySize || undefined,
          location:    prospect.location    || undefined,
          linkedinUrl: prospect.linkedinUrl || undefined,
        },
        {
          stepNumber:          currentSequence.stepNumber,
          totalSteps:          campaign.sequences.length,
          dayGap:              currentSequence.delayDays,
          product:             context.product,
          targetDescription:   context.targetDescription,
          valueProposition:    context.valueProposition,
          senderName:          context.senderName,
          senderPosition:      context.senderPosition,
          senderCompany:       context.senderCompany,
        }
      )

      // Détermine l'adresse email à utiliser
      const emailTo = prospect.emailValid
        || prospect.email1
        || generateEmailVariants(prospect.firstName, prospect.lastName, prospect.domain)[0]

      const email = await prisma.email.create({
        data: {
          sequenceId:  currentSequence.id,
          prospectId:  prospect.id,
          to:          emailTo,
          subject,
          body,
          status:      autoApprove ? "approved" : "pending",
          approvedAt:  autoApprove ? new Date() : null,
        },
      })

      generated.push(email.id)
    } catch (err) {
      console.error(`Erreur génération pour ${prospect.firstName} ${prospect.lastName}:`, err)
      errors.push(`${prospect.firstName} ${prospect.lastName}`)
    }
  }

  return NextResponse.json({
    generated: generated.length,
    errors: errors.length,
    errorDetails: errors,
    autoApproved: autoApprove,
  })
}
