import { getTableSchema, alterTableSchema } from "@/lib/db_pg";
import { NextResponse } from "next/server";

export async function POST(request) {
  const {user, pw, url, ssl, db} = await request.json()
  const { searchParams } = new URL(request.url)
  const table = searchParams.get("table")

  const schema = await getTableSchema(user, pw, url, ssl, db, table)

  return NextResponse.json({ schema })
}

export async function PUT(request) {
  try {
    const {user, pw, url, ssl, db, changes} = await request.json()
    const { searchParams } = new URL(request.url)
    const table = searchParams.get("table")

    await alterTableSchema(user, pw, url, ssl, db, table, changes)
    const schema = await getTableSchema(user, pw, url, ssl, db, table)

    return NextResponse.json({ schema })
  } catch (error) {
    console.error('Schema alteration error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to alter table schema' },
      { status: 500 }
    )
  }
}
