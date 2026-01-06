import { getDBs } from "@/lib/db_pg";
import { NextResponse } from "next/server";

export async function POST(request) {

  const {user, pw, url, ssl} = await request.json()

  const result = await getDBs(user, pw, url, ssl)

  return NextResponse.json({ db: result })
}