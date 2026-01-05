import { getDBs } from "@/lib/db_pg";
import { NextResponse } from "next/server";

export async function POST(request) {

  const {user, pw, url} = await request.json()

  const result = await getDBs(user, pw, url)

  return NextResponse.json({ db: result })
}