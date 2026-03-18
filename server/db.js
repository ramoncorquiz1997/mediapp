import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

import { cie10Common } from csv";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const csvDecoder = new TextDecoder("windows-1252");

const resolveCie10CsvPath = () => {
  const configuredPath = process.env.CIE10_CSV_PATH;
  const repoPath = path.join(__dirname, "data", "cie-10.csv");
  const downloadsPath = path.join(process.env.USERPROFILE || "", "Downloads", "cie-10.csv");

  return [configuredPath, repoPath, downloadsPath].find((candidate) => candidate && fs.existsSync(candidate));
};

const parseCsv = (content) => {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(current);
      current = "";

      if (row.some((cell) => String(cell).trim() !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((cell) => String(cell).trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
};

const parseCatalogRows = (buffer) => {
  const content = csvDecoder.decode(buffer);
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => String(header).trim());
  return rows.slice(1).map((values) =>
    headers.reduce((acc, header, index) => {
      acc[header] = String(values[index] ?? "").trim();
      return acc;
    }, {})
  );
};

const deriveParentCode = (row) => {
  const hierarchy = [row.code_4, row.code_3, row.code_2, row.code_1, row.code_0]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => value !== row.code);

  return hierarchy[0] || null;
};

const isSelectableDiagnosis = (row) => !String(row.code || "").includes("-");

const seedCie10FromCsv = async (csvPath) => {
  const rawRows = parseCatalogRows(fs.readFileSync(csvPath));
  if (rawRows.length === 0) return false;

  await pool.query("TRUNCATE TABLE cie10_raw");

  for (const row of rawRows) {
    await pool.query(
      `INSERT INTO cie10_raw (
        code, code_0, code_1, code_2, code_3, code_4, description, level, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (code) DO UPDATE
      SET
        code_0 = EXCLUDED.code_0,
        code_1 = EXCLUDED.code_1,
        code_2 = EXCLUDED.code_2,
        code_3 = EXCLUDED.code_3,
        code_4 = EXCLUDED.code_4,
        description = EXCLUDED.description,
        level = EXCLUDED.level,
        source = EXCLUDED.source,
        imported_at = NOW()`,
      [
        row.code || null,
        row.code_0 || null,
        row.code_1 || null,
        row.code_2 || null,
        row.code_3 || null,
        row.code_4 || null,
        row.description || "",
        row.level ? Number(row.level) : null,
        row.source || "csv",
      ]
    );
  }

  await pool.query("TRUNCATE TABLE cie10");

  for (const row of rawRows) {
    await pool.query(
      `INSERT INTO cie10 (
        codigo, descripcion, nivel, codigo_padre, seleccionable, source
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (codigo) DO UPDATE
      SET
        descripcion = EXCLUDED.descripcion,
        nivel = EXCLUDED.nivel,
        codigo_padre = EXCLUDED.codigo_padre,
        seleccionable = EXCLUDED.seleccionable,
        source = EXCLUDED.source`,
      [
        row.code || null,
        row.description || "",
        row.level ? Number(row.level) : null,
        deriveParentCode(row),
        isSelectableDiagnosis(row),
        row.source || "csv",
      ]
    );
  }

  return true;
};

const seedCie10Fallback = async () => {
  for (const item of cie10Common) {
    await pool.query(
      `INSERT INTO cie10 (codigo, descripcion, nivel, codigo_padre, seleccionable, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (codigo) DO UPDATE
       SET
         descripcion = EXCLUDED.descripcion,
         nivel = EXCLUDED.nivel,
         codigo_padre = EXCLUDED.codigo_padre,
         seleccionable = EXCLUDED.seleccionable,
         source = EXCLUDED.source`,
      [item.codigo, item.descripcion, 2, null, true, "fallback"]
    );
  }
};

async function ensureSchema() {
  const initSqlPath = path.join(__dirname, "sql", "init.sql");
  const sql = fs.readFileSync(initSqlPath, "utf-8");
  await pool.query(sql);

  const csvPath = resolveCie10CsvPath();
  const seededFromCsv = csvPath ? await seedCie10FromCsv(csvPath) : false;

  if (!seededFromCsv) {
    await seedCie10Fallback();
  }
}

export { pool, ensureSchema };
