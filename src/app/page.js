'use client'

import { useEffect, useState, useMemo } from "react";

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

  // Pagination & Virtualization
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalRows, setTotalRows] = useState(0)

  // Search functionality
  const [searchTerm, setSearchTerm] = useState("")
  const [searchColumn, setSearchColumn] = useState("all")

  // Schema editor mode
  const [schemaMode, setSchemaMode] = useState(false)
  const [schema, setSchema] = useState(null)

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
      console.error(e)
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
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadTable = async (table, pageNum = 1) => {
    try {
      setLoading(true)
      setCountChanges(0)
      setChecked([])
      setPage(pageNum)
      const response = await fetch(`/api/loadtable?table=${table}&page=${pageNum}&pageSize=${pageSize}`,{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setTable(data.table)
      setTableOld(data.table)
      setTableName(table)
      setTotalRows(data.total || data.table.length)
      if (data.table.length > 0) {
        setTableHead(Object.keys(data.table[0]))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadSchema = async (table) => {
    try {
      const response = await fetch(`/api/schema?table=${table}`,{
        method: "POST",
        body: JSON.stringify(dbURL)
      })
      const data = await response.json()
      setSchema(data.schema)
    } catch (e) {
      console.error(e)
    }
  }

  const updateSchema = async (schemaChanges) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/schema?table=${tableName}`,{
        method: "PUT",
        body: JSON.stringify({...dbURL, changes: schemaChanges})
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Schema update failed')
      }

      const data = await response.json()
      setSchema(data.schema)
      await loadTable(tableName, page)
      alert('Schema erfolgreich aktualisiert!')
    } catch (e) {
      console.error('Schema update error:', e)
      alert(`Fehler beim Aktualisieren des Schemas: ${e.message}`)
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
      await loadTable(tableName, page)
    } catch (e) {
      console.error(e)
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
      setChecked([])
      await loadTable(tableName, page)
    } catch (e) {
      console.error(e)
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

  // Filter table based on search
  const filteredTable = useMemo(() => {
    if (!table || !searchTerm) return table;

    return table.filter(row => {
      if (searchColumn === "all") {
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        return String(row[searchColumn]).toLowerCase().includes(searchTerm.toLowerCase());
      }
    });
  }, [table, searchTerm, searchColumn]);

  const totalPages = Math.ceil(totalRows / pageSize);

  const handleTableClick = async (table) => {
    setSchemaMode(false)
    await loadTable(table)
    await loadSchema(table)
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-black">
      <div className="sticky top-0 h-screen min-w-[12dvw] w-fit px-2 bg-zinc-300 flex flex-col items-center justify-start">
        {dbs.map((db, index) => (
          <button key={index} onClick={() => {loadDB(db.datname)}}>{db.datname}</button>
        ))}
        <div className="h-16"/>
        {db.map((db, index) => (
          <button key={index} onClick={() => handleTableClick(db.tablename)} className="text-left hover:bg-zinc-400 px-2 py-1 rounded">{db.tablename}</button>
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
        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <p className="px-2 py-1 bg-yellow-200 rounded">{countChanges} Änderungen</p>
          <button onClick={() => setTable(tableOld)} className="ring px-2 py-1">Discard Changes</button>
          <button onClick={() => updateTable()} className="ring px-2 py-1 bg-blue-500 text-white">Update</button>
          <button onClick={() => deleteRow()} className="ring px-2 py-1 bg-red-500 text-white" disabled={checked.length === 0}>Delete Selected ({checked.length})</button>
          <button
            onClick={() => setSchemaMode(!schemaMode)}
            className={`ring px-2 py-1 ${schemaMode ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
          >
            {schemaMode ? 'Daten Modus' : 'Schema Modus'}
          </button>
        </div>

        {/* Search Controls */}
        {table && !schemaMode && (
          <div className="flex gap-2 mt-2 items-center">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ring ring-black px-2 py-1 flex-1 max-w-md"
            />
            <select
              value={searchColumn}
              onChange={(e) => setSearchColumn(e.target.value)}
              className="ring ring-black px-2 py-1"
            >
              <option value="all">Alle Spalten</option>
              {tableHead && tableHead.map((col, idx) => (
                <option key={idx} value={col}>{col}</option>
              ))}
            </select>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="px-2 py-1 bg-gray-300 rounded">
                Clear
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {table && !schemaMode && (
          <div className="flex gap-2 mt-2 items-center">
            <button
              onClick={() => loadTable(tableName, Math.max(1, page - 1))}
              disabled={page === 1}
              className="ring px-2 py-1 disabled:opacity-50"
            >
              ← Vorherige
            </button>
            <span>Seite {page} von {totalPages} ({totalRows} Zeilen)</span>
            <button
              onClick={() => loadTable(tableName, Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="ring px-2 py-1 disabled:opacity-50"
            >
              Nächste →
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                loadTable(tableName, 1)
              }}
              className="ring ring-black px-2 py-1"
            >
              <option value="25">25 / Seite</option>
              <option value="50">50 / Seite</option>
              <option value="100">100 / Seite</option>
              <option value="200">200 / Seite</option>
              <option value="500">500 / Seite</option>
            </select>
          </div>
        )}

        {loading && <p className="mt-2 text-blue-600">Loading...</p>}
        {table && <p className="font-bold mt-2 text-2xl">{tableName}</p>}

        {/* Schema Editor Mode */}
        {schemaMode && schema && (
          <SchemaEditor
            schema={schema}
            tableName={tableName}
            onUpdate={updateSchema}
            onClose={() => setSchemaMode(false)}
          />
        )}

        {/* Data Table */}
        {!schemaMode && table && tableHead && <div className="w-full overflow-auto">
          <table className="min-w-full text-sm text-left rtl:text-right text-body mt-4">
            <thead className="bg-neutral-secondary-soft relative">
              <tr>
                <th className="px-2 py-0.5 border sticky top-0 left-0 bg-gray-600/50 z-10">
                  <input
                    type="checkbox"
                    checked={filteredTable && filteredTable.length > 0 && filteredTable.every(row => checked.includes(row.id))}
                    onChange={(e) => setChecked(e.target.checked ? filteredTable.map(row => row.id) : [])}
                  />
                </th>
                {tableHead.map((row, index) => (
                  <th scope="col" key={index} className="px-9 py-0.5 border font-medium sticky top-0 bg-gray-200">{row}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTable && filteredTable.map((rows, rowIndex)=>{
                return (
                  <tr className="hover:bg-gray-100" key={rowIndex}>
                    <td className="px-2 py-0.5 border sticky left-0 bg-white">
                      <input
                        type="checkbox"
                        checked={checked.includes(rows["id"])}
                        onChange={(e) => setChecked(
                          e.target.checked
                            ? [...checked, rows["id"]]
                            : checked.filter(id => id !== rows["id"])
                        )}
                      />
                    </td>
                    {tableHead.map((head, index) => (
                      <td className="border" key={index}>
                        <input
                          value={rows[head] ?? ''}
                          type={typeof rows[head] === 'number' ? 'number' : 'text'}
                          onChange={(e) => checkChanges(e, rowIndex, head, typeof rows[head] === 'number')}
                          className="px-2 py-0.5 w-full" />
                      </td>
                    ))}
                  </tr>
              )})}
            </tbody>
          </table>
          {filteredTable && filteredTable.length === 0 && searchTerm && (
            <p className="text-center py-4 text-gray-500">Keine Ergebnisse für "{searchTerm}"</p>
          )}
        </div>
        }
      </div>
    </div>
  );
}

// Schema Editor Component
function SchemaEditor({ schema, tableName, onUpdate, onClose }) {
  const [columns, setColumns] = useState(schema || []);
  const [newColumn, setNewColumn] = useState({ name: '', type: 'TEXT', nullable: true, defaultValue: '' });

  useEffect(() => {
    setColumns(schema || []);
  }, [schema]);

  const addColumn = () => {
    if (!newColumn.name) return;
    const change = {
      action: 'ADD',
      columnName: newColumn.name,
      dataType: newColumn.type,
      nullable: newColumn.nullable,
      default: newColumn.defaultValue
    };
    onUpdate([change]);
    setNewColumn({ name: '', type: 'TEXT', nullable: true, defaultValue: '' });
  };

  const dropColumn = (columnName) => {
    if (!confirm(`Spalte "${columnName}" wirklich löschen?`)) return;
    const change = {
      action: 'DROP',
      columnName
    };
    onUpdate([change]);
  };

  const renameColumn = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    const change = {
      action: 'RENAME',
      oldColumnName: oldName,
      newColumnName: newName
    };
    onUpdate([change]);
  };

  const changeType = (columnName, newType) => {
    const change = {
      action: 'ALTER_TYPE',
      columnName,
      dataType: newType
    };
    onUpdate([change]);
  };

  const changeDefault = (columnName, newDefault) => {
    const change = {
      action: 'ALTER_DEFAULT',
      columnName,
      default: newDefault
    };
    onUpdate([change]);
  };

  return (
    <div className="mt-4 p-4 border-2 border-purple-500 rounded">
      <h2 className="text-xl font-bold mb-4">Schema Editor - {tableName}</h2>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Neue Spalte hinzufügen</h3>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Spaltenname"
            value={newColumn.name}
            onChange={(e) => setNewColumn({...newColumn, name: e.target.value})}
            className="ring ring-black px-2 py-1"
          />
          <select
            value={newColumn.type}
            onChange={(e) => setNewColumn({...newColumn, type: e.target.value})}
            className="ring ring-black px-2 py-1"
          >
            <option value="TEXT">TEXT</option>
            <option value="VARCHAR(255)">VARCHAR(255)</option>
            <option value="INTEGER">INTEGER</option>
            <option value="BIGINT">BIGINT</option>
            <option value="BOOLEAN">BOOLEAN</option>
            <option value="TIMESTAMP">TIMESTAMP</option>
            <option value="DATE">DATE</option>
            <option value="NUMERIC">NUMERIC</option>
            <option value="JSONB">JSONB</option>
          </select>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={newColumn.nullable}
              onChange={(e) => setNewColumn({...newColumn, nullable: e.target.checked})}
            />
            Nullable
          </label>
          <input
            type="text"
            placeholder="Default (z.B. 0, true, 'text')"
            value={newColumn.defaultValue}
            onChange={(e) => setNewColumn({...newColumn, defaultValue: e.target.value})}
            className="ring ring-black px-2 py-1"
          />
          <button onClick={addColumn} className="px-3 py-1 bg-green-500 text-white rounded">
            Hinzufügen
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-2 py-1">Spaltenname</th>
              <th className="border px-2 py-1">Datentyp</th>
              <th className="border px-2 py-1">Nullable</th>
              <th className="border px-2 py-1">Default</th>
              <th className="border px-2 py-1">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col, idx) => (
              <ColumnRow
                key={idx}
                column={col}
                onRename={renameColumn}
                onChangeType={changeType}
                onChangeDefault={changeDefault}
                onDrop={dropColumn}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnRow({ column, onRename, onChangeType, onChangeDefault, onDrop }) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(column.column_name);
  const [defaultValue, setDefaultValue] = useState(column.column_default ?? '');
  const [defaultDirty, setDefaultDirty] = useState(false);

  useEffect(() => {
    setDefaultValue(column.column_default ?? '');
    setDefaultDirty(false);
  }, [column.column_default]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="border px-2 py-1">
        {editing ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="ring ring-black px-1 py-0.5 text-sm"
            />
            <button
              onClick={() => {
                onRename(column.column_name, newName);
                setEditing(false);
              }}
              className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setNewName(column.column_name);
                setEditing(false);
              }}
              className="px-2 py-0.5 bg-gray-300 text-xs rounded"
            >
              ✗
            </button>
          </div>
        ) : (
          <span onDoubleClick={() => setEditing(true)}>{column.column_name}</span>
        )}
      </td>
      <td className="border px-2 py-1">
        <select
          value={column.data_type}
          onChange={(e) => onChangeType(column.column_name, e.target.value)}
          className="text-sm px-1"
          disabled={column.column_name === 'id'}
        >
          <option value="text">TEXT</option>
          <option value="character varying">VARCHAR</option>
          <option value="integer">INTEGER</option>
          <option value="bigint">BIGINT</option>
          <option value="boolean">BOOLEAN</option>
          <option value="timestamp without time zone">TIMESTAMP</option>
          <option value="date">DATE</option>
          <option value="numeric">NUMERIC</option>
          <option value="jsonb">JSONB</option>
        </select>
      </td>
      <td className="border px-2 py-1 text-center">{column.is_nullable}</td>
      <td className="border px-2 py-1">
        <div className="flex gap-1 items-center">
          <input
            type="text"
            value={defaultValue}
            onChange={(e) => {
              setDefaultValue(e.target.value);
              setDefaultDirty(true);
            }}
            className="ring ring-black px-1 py-0.5 text-sm w-full"
          />
          <button
            onClick={() => {
              const currentDefault = column.column_default ?? '';
              if (defaultValue !== currentDefault) {
                onChangeDefault(column.column_name, defaultValue);
              }
              setDefaultDirty(false);
            }}
            disabled={!defaultDirty}
            className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ✓
          </button>
        </div>
      </td>
      <td className="border px-2 py-1">
        <button
          onClick={() => onDrop(column.column_name)}
          disabled={column.column_name === 'id'}
          className="px-2 py-0.5 bg-red-500 text-white text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Löschen
        </button>
      </td>
    </tr>
  );
}
