import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateEmail } from "@/lib/claude"
import { generateEmailVariants } from "@/lib/email-patterns"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()
  const campaignId = body.campaignId
  const autoApprove = body.autoApprove || false
  const limit = body.limit || 100

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      sequences: { orderBy: { stepNumber: "asc" } },
      campaignProspects: {
        where: { status: { in: ["active", "pending"] } },
        include: { prospect: true },
      },
    },
  })

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 })
  }

  const prospectsToProcess = campaign.campaignProspects.slice(0, limit)
  const generated: string[] = []
  const errors: string[] = []

  for (const cp of prospectsToProcess) {
    const nextStep = cp.currentStep + 1
    const currentSequence = campaign.sequences.find(s => s.stepNumber === nextStep)
    if (!currentSequence) continue

    const existing = await prisma.email.findFirst({
      where: {
        sequenceId: currentSequence.id,
        prospectId: cp.prospectId,
        status: { not: "bounced" },
      },
    })
    if (existing) continue

    const prospect = cp.prospect
    const context = JSON.parse(currentSequence.prompt)

    try {
      const result = await generateEmail(
        {
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          company: prospect.company,
          position: prospect.position || "",
          industry: prospect.industry || undefined,
          companySize: prospect.companySize || undefined,
          location: prospect.location || undefined,
          linkedinUrl: prospect.linkedinUrl || undefined,
        },
        {
          stepNumber: currentSequence.stepNumber,
          totalSteps: campaign.sequences.length,
          dayGap: currentSequence.delayDays,
          product: context.product,
          targetDescription: context.targetDescription,
          valueProposition: context.valueProposition,
          senderName: context.senderName,
          senderPosition: context.senderPosition,
          senderCompany: context.senderCompany,
        }
      )

      const emailTo = prospect.emailValid
        || prospect.email1
        || generateEmailVariants(prospect.firstName, prospect.lastName, prospect.domain)[0]

      const email = await prisma.email.create({
        data: {
          sequenceId: currentSequence.id,
          prospectId: prospect.id,
          to: emailTo,
          subject: result.subject,
          body: result.body,
          status: autoApprove ? "approved" : "pending",
          approvedAt: autoApprove ? new Date() : null,
        },
      })

      generated.push(email.id)
    } catch (err) {
      console.error("Erreur Claude:", String(err))
      errors.push(prospect.firstName + " " + prospect.lastName)
    }
  }

  return NextResponse.json({
    generated: generated.length,
    errors: errors.length,
    errorDetails: errors,
    autoApproved: autoApprove,
  })
}