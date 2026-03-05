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

export async function getTable(user, pw, url, ssl, db, table, limit = 50, offset = 0){
  return await executeSQL(`SELECT * FROM ${table} ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset], user, pw, url, ssl, db)
}

export async function getTableCount(user, pw, url, ssl, db, table){
  return await executeSQL(`SELECT COUNT(*) FROM ${table}`, [], user, pw, url, ssl, db)
}

export async function getTableSchema(user, pw, url, ssl, db, table){
  return await executeSQL(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [table], user, pw, url, ssl, db)
}

export async function alterTableSchema(user, pw, url, ssl, db, table, changes){
  const pool = await generatePool(user, pw, url, ssl, db)
  const client = await pool.connect()

  try {
    await client.query('BEGIN');

    for (const change of changes) {
      let sql = '';

      switch (change.action) {
        case 'ADD':
          // Check if column already exists
          const addCheckResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, change.columnName]);

          if (addCheckResult.rows.length === 0) {
            sql = `ALTER TABLE ${table} ADD COLUMN ${change.columnName} ${change.dataType}`;
            if (!change.nullable) sql += ' NOT NULL';
            if (change.default !== undefined && change.default !== null && change.default !== '') {
              sql += ` DEFAULT ${change.default}`;
            }
          } else {
            console.log(`Column ${change.columnName} already exists, skipping ADD`);
            continue;
          }
          break;

        case 'DROP':
          // Check if column exists before dropping
          const dropCheckResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, change.columnName]);

          if (dropCheckResult.rows.length > 0) {
            sql = `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${change.columnName}`;
          } else {
            console.log(`Column ${change.columnName} does not exist, skipping DROP`);
            continue;
          }
          break;

        case 'RENAME':
          // Check if old column exists
          const renameCheckResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, change.oldColumnName]);

          if (renameCheckResult.rows.length > 0) {
            sql = `ALTER TABLE ${table} RENAME COLUMN ${change.oldColumnName} TO ${change.newColumnName}`;
          } else {
            console.log(`Column ${change.oldColumnName} does not exist, skipping RENAME`);
            continue;
          }
          break;

        case 'ALTER_TYPE':
          // Check if column exists before altering type
          const typeCheckResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, change.columnName]);

          if (typeCheckResult.rows.length > 0) {
            sql = `ALTER TABLE ${table} ALTER COLUMN ${change.columnName} TYPE ${change.dataType}`;
          } else {
            console.log(`Column ${change.columnName} does not exist, skipping ALTER TYPE`);
            continue;
          }
          break;

        case 'ALTER_DEFAULT':
          // Check if column exists before altering default
          const defaultCheckResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, change.columnName]);

          if (defaultCheckResult.rows.length > 0) {
            if (change.default === undefined || change.default === null || change.default === '') {
              sql = `ALTER TABLE ${table} ALTER COLUMN ${change.columnName} DROP DEFAULT`;
            } else {
              sql = `ALTER TABLE ${table} ALTER COLUMN ${change.columnName} SET DEFAULT ${change.default}`;
            }
          } else {
            console.log(`Column ${change.columnName} does not exist, skipping ALTER DEFAULT`);
            continue;
          }
          break;

        default:
          throw new Error(`Unknown action: ${change.action}`);
      }

      if (sql) {
        await client.query(sql);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Schema alteration error:', err);
    throw err;
  } finally {
    client.release();
  }
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