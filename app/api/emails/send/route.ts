import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"
import { generateEmailVariants } from "@/lib/email-patterns"

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Envoie tous les emails approuvés (ou un batch)
export async function POST(req: NextRequest) {
  const { emailIds, campaignId } = await req.json()

  const where = emailIds?.length
    ? { id: { in: emailIds }, status: "approved" }
    : { status: "approved", ...(campaignId ? { sequence: { campaignId } } : {}) }

  const emails = await prisma.email.findMany({ where, take: 50 })

  const results = { sent: 0, bounced: 0, errors: [] as string[] }

  for (const email of emails) {
    const prospect = await prisma.prospect.findUnique({ where: { id: email.prospectId } })
    if (!prospect) continue

    // Essaie les adresses dans l'ordre : emailValid → email1 → email2 → email3
    const candidates = [
      prospect.emailValid,
      prospect.email1,
      prospect.email2,
      prospect.email3,
    ].filter(Boolean) as string[]

    if (!candidates.length && prospect.domain) {
      candidates.push(...generateEmailVariants(prospect.firstName, prospect.lastName, prospect.domain))
    }

    let sent = false
    for (const address of candidates) {
      try {
        await transporter.sendMail({
          from:    `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
          to:      address,
          subject: email.subject,
          text:    email.body,
          html:    email.body.replace(/\n/g, "<br>"),
        })

        // Succès — enregistre l'adresse valide
        await prisma.$transaction([
          prisma.email.update({
            where: { id: email.id },
            data: { status: "sent", sentAt: new Date(), to: address },
          }),
          prisma.prospect.update({
            where: { id: prospect.id },
            data: { emailValid: address },
          }),
        ])

        // Passe au step suivant dans la campagne
        await prisma.campaignProspect.updateMany({
          where: { prospectId: prospect.id },
          data:  { currentStep: { increment: 1 } },
        })

        results.sent++
        sent = true
        break

      } catch (err: unknown) {
        const isBounce = err instanceof Error &&
          (err.message.includes("550") || err.message.includes("551") ||
           err.message.includes("553") || err.message.includes("User unknown"))

        if (isBounce) continue // essaie l'adresse suivante
        // Autre erreur SMTP (timeout, auth...) → arrête pour cet email
        results.errors.push(`${prospect.firstName} ${prospect.lastName}: ${err instanceof Error ? err.message : String(err)}`)
        break
      }
    }

    if (!sent && !results.errors.find(e => e.startsWith(prospect.firstName))) {
      await prisma.email.update({
        where: { id: email.id },
        data:  { status: "bounced", bouncedAt: new Date() },
      })
      results.bounced++
    }
  }

  return NextResponse.json(results)
}
