import { getTable, getTableCount } from "@/lib/db_pg";
import { NextResponse } from "next/server";

export async function POST(request) {

  const {user, pw, url, ssl, db} = await request.json()
  const { searchParams } = new URL(request.url)
  const table = searchParams.get("table")
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "50")
  const search = searchParams.get("search") || ""
  const searchColumn = searchParams.get("searchColumn") || "all"

  const offset = (page - 1) * pageSize

  const [result, countResult] = await Promise.all([
    getTable(user, pw, url, ssl, db, table, pageSize, offset, search, searchColumn),
    getTableCount(user, pw, url, ssl, db, table, search, searchColumn)
  ])

  return NextResponse.json({
    table: result,
    total: countResult[0]?.count || 0,
    page,
    pageSize
  })
}