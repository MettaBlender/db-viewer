import {Pool} from'pg'
import { buildBatchUpdateQueries } from './functions'

async function generatePool(user, pw, url, ssl, db){
  const connectionString = `postgres://${user}:${pw}@${url}/${db}${ssl === true ? '?sslmode=require' : ''}`
  const pool = new Pool({
    connectionString: connectionString
  })
  return pool
}

async function executeSQL(sql,values, user, pw, url, ssl, db = "postgres"){
  try {
    const pool = await generatePool(user, pw, url, ssl, db)
    const client = await pool.connect()
    const result = await client.query(sql, values);
    client.release();
    return result.rows;
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function getDBs(user, pw, url, ssl){
  return await executeSQL("SELECT datname FROM pg_database WHERE datistemplate = false;",[], user, pw, url, ssl)
}

export async function getDB(user, pw, url, ssl, db){
  return await executeSQL(`SELECT tablename
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schemaname, tablename;`,[], user, pw, url, ssl, db)
}

export async function getTable(user, pw, url, ssl, db, table){
  return await executeSQL(`SELECT * FROM ${table}`,[], user, pw, url, ssl, db)
}

export async function updateTable(user, pw, url, ssl, db, table, values){
  const queries = buildBatchUpdateQueries(table, values);
  const pool = await generatePool(user, pw, url, ssl, db)
  const client = await pool.connect()
  try {
    await client.query('BEGIN');

    const results = [];
    for (const q of queries) {
      const res = await client.query(q);
      results.push(...res.rows);
    }

    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteRow(user, pw, url, ssl, db, table, values){
  return await executeSQL(`DELETE FROM ${table} WHERE id = ANY($1)`,[values], user, pw, url, ssl, db)
}