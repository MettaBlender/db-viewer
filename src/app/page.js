'use client'

import { useState } from "react";

export default function Home() {

  const [dbURL, setDBURL] = useState({
    user: "nicuser",
    pw: "nicpassword",
    url: "localhost:5432",
    db: "postgresql"
  })
  const [dbs, setDBs] = useState([])
  const [db, setDB] = useState([])
  const [table, setTable] = useState(null)
  const [tableHead, setTableHead] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadDBs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/loaddbs",{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setDBs(data.db)
    } catch (e) {

    } finally {
      setLoading(false)
    }
  }

  const loadDB = async (db) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/loaddb?db=${db}`,{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setDBURL({...dbURL, db: db})
      setDB(data.db)
    } catch (e) {

    } finally {
      setLoading(false)
    }
  }

  const loadTable = async (table) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/loadtable?table=${table}`,{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setTable(data.table)
      setTableHead(Object.keys(data.table[0]))
    } catch (e) {

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen overflow-auto bg-zinc-50 font-sans text-black">
      <div className="h-screen w-1/6 bg-zinc-300 flex flex-col items-center justify-start">
        {dbs.map((db, index) => (
          <button key={index} onClick={() => {loadDB(db.datname)}}>{db.datname}</button>
        ))}
        <div className="h-16"/>
        {db.map((db, index) => (
          <button key={index} onClick={() => {loadTable(db.tablename)}}>{db.tablename}</button>
        ))}
      </div>
      <div className="flex flex-col">
        <div>
        <input value={dbURL.user} onChange={(e) => {setDBURL({...dbURL, user: e.target.value})}} className="ring ring-black text-black"/>
        <input value={dbURL.pw} onChange={(e) => {setDBURL({...dbURL, pw: e.target.value})}} className="ring ring-black text-black"/>
        <input value={dbURL.url} onChange={(e) => {setDBURL({...dbURL, url: e.target.value})}} className="ring ring-black text-black"/>
        <button onClick={loadDBs}>DB Laden</button>
        </div>
        {loading && <p>Loading...</p>}
        {table && <table className="min-w-full text-sm text-left rtl:text-right text-body">
          <thead className="bg-neutral-secondary-soft border-b border-default">
            <tr>
              {tableHead.map((row) => (
                <th scope="col" className="px-6 py-3 font-medium">{row}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((rows)=>{
              return (
                <tr className="odd:bg-zinc-700 even:bg-zinc-300 odd:text-white border-b border-default">
                  {tableHead.map((head) => (
                    <td className="px-6 py-4">
                      {rows[head]}
                    </td>
                  ))}
                </tr>
            )})}
          </tbody>
        </table>}
      </div>
    </div>
  );
}
