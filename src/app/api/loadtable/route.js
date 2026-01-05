import { getTable } from "@/lib/db_pg";
import { NextResponse } from "next/server";

export async function POST(request) {

  const {user, pw, url, db} = await request.json()
  const { searchParams } = new URL(request.url)
  const table = searchParams.get("table")

  const result = await getTable(user, pw, url, db, table)

  return NextResponse.json({ table: result })
}