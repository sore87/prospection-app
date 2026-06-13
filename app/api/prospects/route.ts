import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page  = parseInt(searchParams.get("page")  || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const search = searchParams.get("search") || ""

  const where = search ? {
    OR: [
      { firstName:  { contains: search } },
      { lastName:   { contains: search } },
      { company:    { contains: search } },
      { position:   { contains: search } },
    ],
  } : {}

  const [prospects, total] = await Promise.all([
    prisma.prospect.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.prospect.count({ where }),
  ])

  return NextResponse.json({ prospects, total, page, pages: Math.ceil(total / limit) })
}

export async function DELETE(req: NextRequest) {
  const { ids } = await req.json()
  await prisma.prospect.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ success: true, deleted: ids.length })
}
