'use client'

import { useEffect, useState } from "react";

export default function Home() {

  const [dbURL, setDBURL] = useState({
    user: "nicuser",
    pw: "nicpassword",
    url: "localhost:5432",
    ssl: false,
    db: "postgresql"
  })
  const [dbs, setDBs] = useState([])
  const [db, setDB] = useState([])
  const [table, setTable] = useState(null)
  const [tableName, setTableName] = useState("")
  const [tableOld, setTableOld] = useState(null)
  const [tableHead, setTableHead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [countChanges, setCountChanges] = useState(0)
  const [checked, setChecked] = useState([])

  useEffect(() => {
    searchChanges()
  }, [table])

  useEffect(() => {
    setDBURL({
      user: localStorage.getItem("username") ?? "test",
      pw: localStorage.getItem("password") ?? "test",
      url: localStorage.getItem("url") ?? "localhost:5432",
      ssl: localStorage.getItem("ssl") ?? false
    })
  }, [])


  const loadDBs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/loaddbs",{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setDBs(data.db)
      localStorage.setItem("username", dbURL.user)
      localStorage.setItem("password", dbURL.pw)
      localStorage.setItem("url", dbURL.url)
      localStorage.setItem("ssl", dbURL.ssl)
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
      setCountChanges(0)
      setChecked([])
      const response = await fetch(`/api/loadtable?table=${table}`,{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setTable(data.table)
      setTableOld(data.table)
      setTableName(table)
      setTableHead(Object.keys(data.table[0]))
    } catch (e) {

    } finally {
      setLoading(false)
    }
  }

  const updateTable = async () => {
    try {
      setLoading(true)
      setCountChanges(0)
      const response = await fetch(`/api/updateTable?table=${tableName}`,{
        method: "POST",
        body: JSON.stringify({...dbURL, values: table})
      })
      const data = await response.json()
      setTable(data.table)
      setTableOld(data.table)
      setTableHead(Object.keys(data.table[0]))
    } catch (e) {

    } finally {
      setLoading(false)
    }
  }

  const deleteRow = async () => {
    try {
      setLoading(true)
      setCountChanges(0)
      await fetch(`/api/deleteRow?table=${tableName}`,{
        method: "POST",
        body: JSON.stringify({...dbURL, values: checked})
      })
      await loadTable(tableName)
    } catch (e) {

    } finally {
      setLoading(false)
    }
  }

  const checkChanges = (e, rowIndex, head, number) => {
    const newValue = e.target.value;

    setTable(prevTable =>
      prevTable.map((r, i) =>
        i === rowIndex
          ? { ...r, [head]: number ? Number(newValue) : newValue }
          : r
      )
    );
  }

  const searchChanges = async () => {

    if(!tableOld || !table) {
      return 0
    }

    const tableOldMap = new Map(tableOld.map(item => [item.id, item]));
    const tableMap = new Map(table.map(item => [item.id, item]));

    const allIds = new Set([...tableOldMap.keys(), ...tableMap.keys()]);

    let abweichungen = 0

    for (const id of allIds) {
      const alt = tableOldMap.get(id);
      const neu = tableMap.get(id);

      // Fall 1: Neues Objekt hinzugefügt → zähle alle Felder als Änderung
      if (!alt && neu) {
        const anzahlFelder = Object.keys(neu).length;
        abweichungen += anzahlFelder;
        continue;
      }

      // Fall 2: Objekt entfernt → zähle alle alten Felder als Änderung
      if (alt && !neu) {
        const anzahlFelder = Object.keys(alt).length;
        abweichungen += anzahlFelder;
        continue;
      }

      // Fall 3: Beide vorhanden → vergleiche jedes Feld einzeln
      const keys = new Set([...Object.keys(alt), ...Object.keys(neu)]);
      let aenderungenInDiesemObjekt = 0;

      for (const key of keys) {
        // Spezialfall: Feld existiert nur in einem der Objekte
        if (!(key in alt) || !(key in neu)) {
          aenderungenInDiesemObjekt++;
          continue;
        }

        // Normaler Vergleich der Werte
        if (alt[key] !== neu[key]) {
          aenderungenInDiesemObjekt++;
        }
      }

      if (aenderungenInDiesemObjekt > 0) {
        abweichungen += aenderungenInDiesemObjekt;
      }
    }

    setCountChanges(abweichungen)
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-black">
      <div className="h-screen min-w-[12dvw] w-fit px-2 bg-zinc-300 flex flex-col items-center justify-start">
        {dbs.map((db, index) => (
          <button key={index} onClick={() => {loadDB(db.datname)}}>{db.datname}</button>
        ))}
        <div className="h-16"/>
        {db.map((db, index) => (
          <button key={index} onClick={() => {loadTable(db.tablename)}}>{db.tablename}</button>
        ))}
      </div>
      <div className="flex flex-col w-full overflow-auto px-2">
        <div className="flex gap-2">
          <input value={dbURL.user} onChange={(e) => {setDBURL({...dbURL, user: e.target.value})}} className="ring ring-black text-black"/>
          <input value={dbURL.pw} onChange={(e) => {setDBURL({...dbURL, pw: e.target.value})}} className="ring ring-black text-black"/>
          <input value={dbURL.url} onChange={(e) => {setDBURL({...dbURL, url: e.target.value})}} className="ring ring-black text-black"/>
          <input checked={dbURL.ssl} onChange={(e) => {setDBURL({...dbURL, ssl: e.target.checked})}} type="checkbox" className=" text-black"/>
          <button onClick={loadDBs} className="ring">DB Laden</button>
        </div>
        <div className="flex gap-2 mt-2">
          <p>{countChanges}</p>
          <button onClick={() => setTable(tableOld)} className="ring">Discard Changes</button>
          <button onClick={() => updateTable()} className="ring">Update</button>
          <button onClick={() => deleteRow()} className="ring">Delete Selected</button>
        </div>
        {loading && <p>Loading...</p>}
        {table && <p className="font-bold mt-2 text-2xl">{tableName}</p>}

        {table && tableHead && <div className="w-full overflow-auto">
          <table className="min-w-full text-sm text-left rtl:text-right text-body mt-4">
            <thead className="bg-neutral-secondary-soft relative">
              <tr>
                <th className="px-2 py-0.5 border sticky top-0 left-0 bg-gray-600/50">
                  <input
                    type="checkbox"
                    checked={table.every(row => checked.includes(row.id))}
                    onChange={(e) => setChecked(e.target.checked ? table.map(row => row.id) : [])}
                  />
                </th>
                {tableHead.map((row, index) => (
                  <th scope="col" key={index} className="px-9 py-0.5 border font-medium">{row}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((rows, rowIndex)=>{
                return (
                  <tr className="" key={rowIndex}>
                    <td className="px-2 py-0.5 border sticky top-0 left-0 bg-gray-600/50">
                      <input
                        type="checkbox"
                        checked={checked.includes(rows["id"])}
                        onClick={(e) => setChecked(
                          e.target.checked
                            ? [...checked, rows["id"]]
                            : checked.filter(id => id !== rows["id"])
                        )}
                      />
                    </td>
                    {tableHead.map((head, index) => (
                      <td className="border" key={index}>
                        <input
                          value={rows[head]}
                          type={typeof rows[head] === 'number' ? 'number' : 'text'}
                          onChange={(e) => checkChanges(e, rowIndex, head, typeof rows[head] === 'number')}
                          className="px-2 py-0.5 w-full" />
                      </td>
                    ))}
                  </tr>
              )})}
            </tbody>
          </table>
        </div>
        }
      </div>
    </div>
  );
}
