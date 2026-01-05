import {Pool} from'pg'

async function generatePool(user, pw, url, db){
  const connectionString = `postgres://${user}:${pw}@${url}/${db}`
  const pool = new Pool({
    connectionString: connectionString
  })
  return pool
}

async function executeSQL(sql, user, pw, url, db = "postgres"){
  try {
    const pool = await generatePool(user, pw, url, db)
    const client = await pool.connect()
    const result = await client.query(sql);
    client.release();
    return result.rows;
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function getDBs(user, pw, url){
  return executeSQL("SELECT datname FROM pg_database WHERE datistemplate = false;", user, pw, url)
}

export async function getDB(user, pw, url, db){
  return executeSQL(`SELECT tablename
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schemaname, tablename;`, user, pw, url, db)
}

export async function getTable(user, pw, url, db, table){
  return executeSQL(`SELECT * FROM ${table}`, user, pw, url, db)
}