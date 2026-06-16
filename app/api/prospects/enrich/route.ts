import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const PROSPEO_API_KEY = process.env.PROSPEO_API_KEY

// Enrichit les prospects sans email via Prospeo
export async function POST(req: NextRequest) {
  const { prospectIds } = await req.json()

  if (!PROSPEO_API_KEY) {
    return NextResponse.json({ error: "PROSPEO_API_KEY manquante" }, { status: 500 })
  }

  // Récupère les prospects à enrichir
  const prospects = await prisma.prospect.findMany({
    where: {
      id: prospectIds ? { in: prospectIds } : undefined,
      emailValid: null, // seulement ceux sans email vérifié
    },
    take: 50, // max 50 par batch
  })

  const results = { enriched: 0, notFound: 0, errors: 0 }

  for (const prospect of prospects) {
    try {
      const res = await fetch("https://api.prospeo.io/linkedin-email-finder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KEY": PROSPEO_API_KEY,
        },
        body: JSON.stringify({
          first_name: prospect.firstName,
          last_name: prospect.lastName,
          company: prospect.company,
          domain: prospect.domain || undefined,
        }),
      })

      const data = await res.json()

      if (data.response?.email && data.response?.verification?.status === "VALID") {
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            emailValid: data.response.email,
            email1: data.response.email,
          },
        })
        results.enriched++
      } else {
        results.notFound++
      }
    } catch (err) {
      console.error("Erreur Prospeo pour", prospect.firstName, prospect.lastName, err)
      results.errors++
    }
  }

  return NextResponse.json({
    ...results,
    total: prospects.length,
  })
}
