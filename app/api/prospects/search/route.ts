import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateEmailVariants } from "@/lib/email-patterns"

const PROSPEO_API_KEY = process.env.PROSPEO_API_KEY

export async function POST(req: NextRequest) {
  const { filters, limit = 25, page = 1 } = await req.json()

  if (!PROSPEO_API_KEY) {
    return NextResponse.json({ error: "PROSPEO_API_KEY manquante" }, { status: 500 })
  }

  try {
    // Étape 1 : Search Person → récupère les person_id
    const searchRes = await fetch("https://api.prospeo.io/search-person", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": PROSPEO_API_KEY,
      },
      body: JSON.stringify({ filters, page }),
    })

    const searchData = await searchRes.json()

    if (searchData.error) {
      return NextResponse.json({
        error: "Erreur Prospeo Search",
        details: searchData,
      }, { status: 400 })
    }

    const results = searchData.results || []
    if (results.length === 0) {
      return NextResponse.json({ imported: 0, total: 0, preview: [] })
    }

    // Étape 2 : Bulk Enrich → récupère les emails vérifiés
    const personIds = results
      .slice(0, Math.min(limit, 50))
      .map((r: { person: { id: string } }) => ({ person_id: r.person.id }))

    const enrichRes = await fetch("https://api.prospeo.io/bulk-enrich-person", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": PROSPEO_API_KEY,
      },
      body: JSON.stringify({
        data: personIds,
        only_verified_email: true,
      }),
    })

    const enrichData = await enrichRes.json()
    const enriched = enrichData.results || []

    // Étape 3 : Sauvegarde dans la DB
    const imported: string[] = []
    const preview: object[] = []

    for (const item of enriched) {
      const p = item.person
      const c = item.company

      const firstName   = p?.first_name            || ""
      const lastName    = p?.last_name             || ""
      const company     = c?.name                  || p?.current_company_name || ""
      const domain      = c?.website               || ""
      const position    = p?.job_title             || ""
      const industry    = c?.industry              || ""
      const companySize = c?.employee_range        || ""
      const location    = p?.location              || ""
      const linkedinUrl = p?.linkedin_url          || ""
      const emailValid  = p?.email                 || null

      if (!firstName || !lastName || !company) continue

      preview.push({ firstName, lastName, company, position, email: emailValid })

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
        // doublon ignoré
      }
    }

    return NextResponse.json({
      imported: imported.length,
      total: searchData.pagination?.total_count || 0,
      pages: searchData.pagination?.total_page || 1,
      currentPage: page,
      preview,
    })

  } catch (err) {
    console.error("Erreur recherche Prospeo:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
