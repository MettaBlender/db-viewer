export function prepareUpdatesForPg(blocks) {
  return blocks.map(block => {
    // Entferne die 'id' aus den Changes, damit sie nicht überschrieben wird
    const { id, ...changes } = block;

    // Wandle content von String zu echten JSON, falls nötig
    // (bei dir ist content aktuell ein JSON-String)
    if (typeof changes.content === 'string') {
      try {
        changes.content = JSON.parse(changes.content);
      } catch (e) {
        // falls schon kein String-JSON ist, lass es so
      }
    }

    return {
      id: id,
      changes: changes  // alles außer id wird als zu änderndes Feld übergeben
    };
  });
}

export function buildBatchUpdateQueries(tableName, updates, options = {}) {
  const queries = [];

  for (const item of updates) {
    const { id, ...changes } = item;

    // Falls keine Änderungen oder keine id → überspringen
    if (!id || Object.keys(changes).length === 0) {
      continue;
    }

    const keys = Object.keys(changes);
    const values = Object.values(changes);

    // SET-Teil dynamisch bauen: field1 = $1, field2 = $2, ...
    const setParts = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');

    // Optional: updated_at automatisch setzen
    let finalSet = setParts;
    if (options.updatedAt) {
      finalSet = setParts ? `${setParts}, "updated_at" = NOW()` : `"updated_at" = NOW()`;
    }

    const queryText = `
      UPDATE "${tableName}"
      SET ${finalSet}
      WHERE id = $1
      RETURNING *
    `;

    queries.push({
      text: queryText.trim(),
      values: [id, ...values]
    });
  }

  return queries;
}