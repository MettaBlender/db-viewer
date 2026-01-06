import { updateTable } from "@/lib/db_pg";
import { prepareUpdatesForPg } from "@/lib/functions";
import { NextResponse } from "next/server";

export async function POST(request) {

  const {user, pw, url, ssl, db, values} = await request.json()
  const { searchParams } = new URL(request.url)
  const table = searchParams.get("table")

  const result = await updateTable(user, pw, url, ssl, db, table, values)

  return NextResponse.json({ table: result })
}