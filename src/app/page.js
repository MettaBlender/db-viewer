'use client'

import { useEffect, useRef, useState } from "react";

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
  const [tableOld, setTableOld] = useState(null)
  const [tableHead, setTableHead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [countChanges, setCountChanges] = useState(0)

  useEffect(() => {
    searchChanges()
  }, [table])


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
      setCountChanges(0)
      const response = await fetch(`/api/loadtable?table=${table}`,{
        method: "POST",
        body: JSON.stringify(dbURL)
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
      <div className="h-screen w-[12dvw] bg-zinc-300 flex flex-col items-center justify-start">
        {dbs.map((db, index) => (
          <button key={index} onClick={() => {loadDB(db.datname)}}>{db.datname}</button>
        ))}
        <div className="h-16"/>
        {db.map((db, index) => (
          <button key={index} onClick={() => {loadTable(db.tablename)}}>{db.tablename}</button>
        ))}
      </div>
      <div className="flex flex-col w-[88dvw] overflow-auto">
        <div>
          <input value={dbURL.user} onChange={(e) => {setDBURL({...dbURL, user: e.target.value})}} className="ring ring-black text-black"/>
          <input value={dbURL.pw} onChange={(e) => {setDBURL({...dbURL, pw: e.target.value})}} className="ring ring-black text-black"/>
          <input value={dbURL.url} onChange={(e) => {setDBURL({...dbURL, url: e.target.value})}} className="ring ring-black text-black"/>
          <button onClick={loadDBs}>DB Laden</button>
        </div>
        <div>
          <p>{countChanges}</p>
        </div>
        {loading && <p>Loading...</p>}
        {table && tableHead && <table className="min-w-full text-sm text-left rtl:text-right text-body mt-4">
          <thead className="bg-neutral-secondary-soft border-b border-default">
            <tr>
              <th className="px-2 py-0.5 border">
                <input type="checkbox"/>
              </th>
              {tableHead.map((row) => (
                <th scope="col" className="px-9 py-0.5 border font-medium">{row}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((rows, rowIndex)=>{
              return (
                <tr className="">
                  <td className="px-2 py-0.5 border">
                    <input type="checkbox"/>
                  </td>
                  {tableHead.map((head) => (
                    <td className="border">
                      <input
                        value={rows[head]}
                        type={typeof rows[head] === 'number' ? 'number' : 'text'}
                        onChange={(e) => checkChanges(e, rowIndex, head, typeof rows[head] === 'number')}
                        className="px-2 py-0.5" />
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
