import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateEmailVariants } from "@/lib/email-patterns"

const PROSPEO_API_KEY = process.env.PROSPEO_API_KEY

// Importe des prospects depuis une URL Sales Navigator via Prospeo
export async function POST(req: NextRequest) {
  const { salesNavUrl, limit = 100 } = await req.json()

  if (!PROSPEO_API_KEY) {
    return NextResponse.json({ error: "PROSPEO_API_KEY manquante" }, { status: 500 })
  }

  if (!salesNavUrl) {
    return NextResponse.json({ error: "URL Sales Navigator manquante" }, { status: 400 })
  }

  try {
    // Appel API Prospeo Sales Navigator export
    const res = await fetch("https://api.prospeo.io/sales-navigator-email-finder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": PROSPEO_API_KEY,
      },
      body: JSON.stringify({
        url: salesNavUrl,
        limit: Math.min(limit, 100),
      }),
    })

    const data = await res.json()

    if (!data.response || !Array.isArray(data.response)) {
      return NextResponse.json({
        error: "Réponse Prospeo invalide",
        details: data,
      }, { status: 400 })
    }

    const leads = data.response
    const imported: string[] = []
    const skipped: string[] = []

    for (const lead of leads) {
      const firstName   = lead.first_name || ""
      const lastName    = lead.last_name  || ""
      const company     = lead.company    || ""
      const domain      = lead.domain     || ""
      const position    = lead.job_title  || ""
      const industry    = lead.industry   || ""
      const companySize = lead.company_size || ""
      const location    = lead.location   || ""
      const linkedinUrl = lead.linkedin_url || ""
      const emailValid  = lead.email || null

      if (!firstName || !lastName || !company) {
        skipped.push(`${firstName} ${lastName}`)
        continue
      }

      const [email1, email2, email3] = domain
        ? generateEmailVariants(firstName, lastName, domain)
        : ["", "", ""]

      const id = `${firstName}-${lastName}-${company}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 100)

      try {
        await prisma.prospect.upsert({
          where: { id },
          update: {
            position, industry, companySize, location,
            linkedinUrl, email1, email2, email3,
            ...(emailValid ? { emailValid } : {}),
          },
          create: {
            id, firstName, lastName, company, domain,
            position, industry, companySize, location,
            linkedinUrl, email1, email2, email3, emailValid,
          },
        })
        imported.push(id)
      } catch {
        skipped.push(`${firstName} ${lastName} (doublon)`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      total: leads.length,
    })

  } catch (err) {
    console.error("Erreur import Sales Nav:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
