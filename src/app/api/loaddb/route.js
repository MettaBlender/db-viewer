import { getDB } from "@/lib/db_pg";
import { NextResponse } from "next/server";

export async function POST(request) {

  const {user, pw, url} = await request.json()
  const { searchParams } = new URL(request.url)
  const db = searchParams.get("db")

  const result = await getDB(user, pw, url, db)

  return NextResponse.json({ db: result })
}