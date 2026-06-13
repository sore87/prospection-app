import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { prisma } from "@/lib/prisma"
import { generateEmailVariants } from "@/lib/email-patterns"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })

    const text = await file.text()

    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })

    if (errors.length > 0) {
      return NextResponse.json({ error: "Erreur parsing CSV", details: errors }, { status: 400 })
    }

    const rows = data as Record<string, string>[]
    const created: string[] = []
    const skipped: string[] = []

    for (const row of rows) {
      // Support plusieurs nommages de colonnes courants (Evaboot, Apollo, Sales Nav)
      const firstName    = row["firstName"]    || row["First Name"]    || row["Prénom"]      || ""
      const lastName     = row["lastName"]     || row["Last Name"]     || row["Nom"]         || ""
      const company      = row["company"]      || row["Company"]       || row["Entreprise"]  || ""
      const domain       = row["domain"]       || row["Domain"]        || row["Domaine"]     || ""
      const position     = row["position"]     || row["Job Title"]     || row["Poste"]       || ""
      const industry     = row["industry"]     || row["Industry"]      || row["Secteur"]     || ""
      const companySize  = row["companySize"]  || row["Company Size"]  || row["Taille"]      || ""
      const location     = row["location"]     || row["Location"]      || row["Localisation"]|| ""
      const linkedinUrl  = row["linkedinUrl"]  || row["LinkedIn URL"]  || row["LinkedIn"]    || ""

      if (!firstName || !lastName || !company) {
        skipped.push(`${firstName} ${lastName} (données manquantes)`)
        continue
      }

      // Génère les 3 variantes email si domaine disponible
      const [email1, email2, email3] = domain
        ? generateEmailVariants(firstName, lastName, domain)
        : ["", "", ""]

      const prospect = await prisma.prospect.upsert({
        where: {
          // upsert basé sur prénom+nom+entreprise pour éviter les doublons
          id: `${firstName}-${lastName}-${company}`.toLowerCase().replace(/\s+/g, "-"),
        },
        update: { position, industry, companySize, location, linkedinUrl, email1, email2, email3 },
        create: {
          id: `${firstName}-${lastName}-${company}`.toLowerCase().replace(/\s+/g, "-"),
          firstName, lastName, company, domain,
          position, industry, companySize, location, linkedinUrl,
          email1, email2, email3,
        },
      })

      created.push(prospect.id)
    }

    return NextResponse.json({
      success: true,
      imported: created.length,
      skipped: skipped.length,
      skippedDetails: skipped,
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
