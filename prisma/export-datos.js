/**
 * Exporta los DATOS de la base a un script SQL de INSERT (en orden de llaves foráneas).
 *
 * Uso (usa la base de DATABASE_URL del .env):
 *   node --env-file=.env prisma/export-datos.js [archivo-de-salida.sql]
 *
 * El script resultante NO crea tablas: primero se corre el esquema (prisma/sql/00_esquema_completo.sql)
 * y luego este archivo. Sirve para llevar la base local a Somee (o a cualquier SQL Server).
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const salida = process.argv[2] || path.join(__dirname, "sql", "01_datos.sql");

// Cómo se convierte cada tipo de columna a texto en el propio SQL Server (así no se pierde precisión)
function expresion(col) {
  const n = `[${col.COLUMN_NAME}]`;
  switch (col.DATA_TYPE) {
    case "datetime":
    case "datetime2":
    case "smalldatetime":
      return `CONVERT(varchar(30), ${n}, 126)`;
    case "date":
      return `CONVERT(varchar(10), ${n}, 23)`;
    case "bit":
    case "tinyint":
    case "smallint":
    case "int":
    case "bigint":
    case "decimal":
    case "numeric":
    case "float":
    case "real":
    case "money":
      return `CAST(${n} AS varchar(60))`;
    default:
      return n; // nvarchar, varchar, char...
  }
}

function literal(col, valor) {
  if (valor === null || valor === undefined) return "NULL";
  const t = col.DATA_TYPE;

  if (["datetime", "datetime2", "smalldatetime", "date"].includes(t)) return `'${String(valor).replace("T", "T")}'`;
  if (["bit", "tinyint", "smallint", "int", "bigint", "decimal", "numeric", "float", "real", "money"].includes(t)) return String(valor);

  return `N'${String(valor).replace(/'/g, "''")}'`;
}

async function main() {
  const tablas = await prisma.$queryRawUnsafe(`SELECT t.name, t.object_id FROM sys.tables t WHERE t.is_ms_shipped = 0 AND t.name <> '_prisma_migrations'`);
  const fks = await prisma.$queryRawUnsafe(`
    SELECT pt.name AS hija, rt.name AS padre
    FROM sys.foreign_keys fk
    JOIN sys.tables pt ON pt.object_id = fk.parent_object_id
    JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id`);

  // Orden topológico: primero las tablas de las que dependen las demás
  const nombres = tablas.map((t) => t.name);
  const deps = new Map(nombres.map((n) => [n, new Set()]));

  for (const f of fks) if (f.hija !== f.padre && deps.has(f.hija)) deps.get(f.hija).add(f.padre);

  const orden = [];
  const hechos = new Set();

  while (orden.length < nombres.length) {
    const listas = nombres.filter((n) => !hechos.has(n) && [...deps.get(n)].every((d) => hechos.has(d)));

    if (listas.length === 0) throw new Error("Dependencias circulares entre tablas: " + nombres.filter((n) => !hechos.has(n)).join(", "));
    for (const n of listas.sort()) {
      orden.push(n);
      hechos.add(n);
    }
  }

  const base = (await prisma.$queryRawUnsafe(`SELECT DB_NAME() AS db`))[0].db;
  const out = [];

  out.push(`-- Datos de la base "${base}" — exportado ${new Date().toISOString()}`);
  out.push(`-- Primero corre el esquema (00_esquema_completo.sql) y después este archivo.`);
  out.push(`SET NOCOUNT ON;`);
  out.push(``);

  const resumen = [];

  for (const nombre of orden) {
    const cols = await prisma.$queryRawUnsafe(
      `SELECT c.COLUMN_NAME, c.DATA_TYPE, COLUMNPROPERTY(OBJECT_ID('dbo.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS esIdentidad,
              COLUMNPROPERTY(OBJECT_ID('dbo.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsComputed') AS esCalculada
       FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = '${nombre}' ORDER BY c.ORDINAL_POSITION`,
    );
    const utiles = cols.filter((c) => !Number(c.esCalculada));
    const identidad = utiles.some((c) => Number(c.esIdentidad));
    const select = utiles.map((c) => `${expresion(c)} AS [${c.COLUMN_NAME}]`).join(", ");
    const orderBy = utiles[0] ? `ORDER BY [${utiles[0].COLUMN_NAME}]` : "";
    const filas = await prisma.$queryRawUnsafe(`SELECT ${select} FROM [dbo].[${nombre}] ${orderBy}`);

    resumen.push(`${nombre}: ${filas.length}`);
    if (filas.length === 0) continue;

    out.push(`-- ${nombre} (${filas.length} filas)`);
    if (identidad) out.push(`SET IDENTITY_INSERT [dbo].[${nombre}] ON;`);

    const listaCols = utiles.map((c) => `[${c.COLUMN_NAME}]`).join(", ");

    for (const fila of filas) {
      const valores = utiles.map((c) => literal(c, fila[c.COLUMN_NAME])).join(", ");

      out.push(`INSERT INTO [dbo].[${nombre}] (${listaCols}) VALUES (${valores});`);
    }

    if (identidad) out.push(`SET IDENTITY_INSERT [dbo].[${nombre}] OFF;`);
    out.push(``);
  }

  out.push(`-- Resumen: ${resumen.join(" | ")}`);
  fs.writeFileSync(salida, out.join("\r\n"), "utf8");
  console.log("Escrito:", salida);
  console.log(resumen.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
