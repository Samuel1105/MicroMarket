/**
 * Datos de prueba para ver los reportes con información realista.
 *
 *   node --env-file=.env prisma/seed-demo.js --confirmar
 *
 * ¡BORRA los datos del negocio! (ventas, compras, productos, clientes, proveedores,
 * categorías, movimientos y usuarios) y los reemplaza por datos de demostración.
 * Se conservan: las unidades de medida base y la cuenta de administrador existente.
 * Haz un respaldo de la base antes de correrlo. Sin el parámetro --confirmar no hace nada:
 * solo muestra en qué base de datos escribiría.
 *
 * Las fechas son RELATIVAS: el último día de datos es AYER (hora de Bolivia) y el primero es el
 * día 1 de hace 3 meses, así que "Este mes" y "Últimos 30 días" de los reportes siempre tienen datos.
 *
 * Es determinista: cada corrida genera los mismos datos (semilla fija).
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// ───────────────────────── utilidades ─────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260918);
const rint = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickW = (items, w) => {
  const total = w.reduce((s, x) => s + x, 0);
  let r = rnd() * total;

  for (let i = 0; i < items.length; i++) {
    r -= w[i];
    if (r <= 0) return items[i];
  }

  return items[items.length - 1];
};
const round2 = (n) => Math.round(n * 100) / 100;

/** Hora de pared de Bolivia guardada en los campos UTC (igual que getBoliviaTime) */
const dt = (y, m, d, h = 9, mi = 0) => new Date(Date.UTC(y, m - 1, d, h, mi));
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const soloFecha = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const ymd = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");

// Bolivia = UTC-4: "ayer" y "hace 3 meses" se calculan con la hora de pared de Bolivia
const ayerBolivia = new Date(Date.now() - 4 * 3600 * 1000 - 86400000);
const HOY = { y: ayerBolivia.getUTCFullYear(), m: ayerBolivia.getUTCMonth() + 1, d: ayerBolivia.getUTCDate() };
const inicioDate = new Date(Date.UTC(HOY.y, HOY.m - 1 - 3, 1));
const INICIO = { y: inicioDate.getUTCFullYear(), m: inicioDate.getUTCMonth() + 1, d: 1 };

// ───────────────────────── catálogo ─────────────────────────
const CATEGORIAS = ["Abarrotes", "Lácteos", "Bebidas", "Limpieza", "Snacks y Dulces"];

const PROVEEDORES = [
  { nombre: "Distribuidora Central", celular: 71234501, correo: "ventas@distcentral.bo", direccion: "Av. Blanco Galindo km 4, Cochabamba" },
  { nombre: "Lácteos del Valle", celular: 71234502, correo: "pedidos@lacteosvalle.bo", direccion: "Zona Sud, Calle Los Pinos 120" },
  { nombre: "Embotelladora Andina", celular: 71234503, correo: "contacto@andina.bo", direccion: "Parque Industrial, Lote 8" },
  { nombre: "Dulces y Snacks SRL", celular: 71234504, correo: "info@dulcesysnacks.bo", direccion: "Av. América 850" },
];

// costo = por unidad de compra · precio = por unidad base · peso = frecuencia de venta
const PRODUCTOS = [
  { key: "arroz", nombre: "Arroz Extra 1kg", desc: "Arroz grano largo, venta por kilo", cat: "Abarrotes", prov: 0, base: "Kilogramo", min: 25,
    packs: [{ u: "Bolsa", factor: 5, precio: 40 }], compra: { u: "Bolsa", factor: 5, costo: 32, qty: [6, 10] },
    precio: 8.5, peso: 8, qtyV: [1, 5], venc: 365, lote: 30, codes: false },
  { key: "aceite", nombre: "Aceite Fino 1L", desc: "Aceite vegetal botella 1 litro", cat: "Abarrotes", prov: 0, base: "Litro", min: 15,
    packs: [{ u: "Caja", factor: 12, precio: 165 }], compra: { u: "Caja", factor: 12, costo: 132, qty: [2, 3] },
    precio: 14, peso: 5, qtyV: [1, 2], venc: 420, lote: 12, codes: false },
  { key: "fideo", nombre: "Fideo Tallarín 400g", desc: "Fideo tallarín paquete 400 g", cat: "Abarrotes", prov: 0, base: "Unidad", min: 30,
    packs: [{ u: "Caja", factor: 20, precio: 84 }], compra: { u: "Caja", factor: 20, costo: 60, qty: [3, 4] },
    precio: 4.5, peso: 8, qtyV: [1, 4], venc: 300, lote: 30, codes: false },
  { key: "leche", nombre: "Leche Entera 1L", desc: "Leche entera pasteurizada", cat: "Lácteos", prov: 1, base: "Litro", min: 24,
    packs: [{ u: "Paquete", factor: 6, precio: 40 }], compra: { u: "Paquete", factor: 6, costo: 30, qty: [8, 12] },
    precio: 7, peso: 9, qtyV: [1, 4], venc: 32, lote: 24, codes: false },
  { key: "yogurt", nombre: "Yogurt Frutilla 1L", desc: "Yogurt batido sabor frutilla", cat: "Lácteos", prov: 1, base: "Unidad", min: 12,
    packs: [{ u: "Caja", factor: 12, precio: 118 }], compra: { u: "Caja", factor: 12, costo: 96, qty: [2, 3] },
    precio: 10.5, peso: 4, qtyV: [1, 3], venc: 22, lote: 12, codes: false },
  { key: "coca", nombre: "Coca-Cola 2L", desc: "Gaseosa Coca-Cola 2 litros", cat: "Bebidas", prov: 2, base: "Unidad", min: 24,
    packs: [{ u: "Paquete", factor: 6, precio: 72 }], compra: { u: "Paquete", factor: 6, costo: 66, qty: [6, 10] },
    precio: 12, peso: 9, qtyV: [1, 3], venc: 180, lote: 24, codes: true },
  { key: "jugo", nombre: "Jugo del Valle 1L", desc: "Jugo de naranja 1 litro", cat: "Bebidas", prov: 2, base: "Unidad", min: 12,
    packs: [{ u: "Caja", factor: 12, precio: 110 }], compra: { u: "Caja", factor: 12, costo: 84, qty: [2, 4] },
    precio: 9.5, peso: 5, qtyV: [1, 3], venc: 150, lote: 24, codes: false },
  { key: "detergente", nombre: "Detergente Ace 1kg", desc: "Detergente en polvo 1 kg", cat: "Limpieza", prov: 0, base: "Unidad", min: 8,
    packs: [{ u: "Caja", factor: 10, precio: 132 }], compra: { u: "Caja", factor: 10, costo: 100, qty: [2, 3] },
    precio: 13.5, peso: 3, qtyV: [1, 2], venc: 720, lote: 10, codes: true },
  { key: "clinex", nombre: "Papel Higiénico Clinex x4", desc: "Papel higiénico paquete x4 rollos", cat: "Limpieza", prov: 0, base: "Unidad", min: 12,
    packs: [{ u: "Paquete", factor: 12, precio: 118 }], compra: { u: "Paquete", factor: 12, costo: 84, qty: [3, 4] },
    precio: 10, peso: 4, qtyV: [1, 2], venc: null, lote: 12, codes: false },
  { key: "oreo", nombre: "Galleta Oreo 117g", desc: "Galletas rellenas de crema", cat: "Snacks y Dulces", prov: 3, base: "Unidad", min: 10,
    packs: [{ u: "Caja", factor: 24, precio: 138 }], compra: { u: "Caja", factor: 24, costo: 96, qty: [1, 2] },
    precio: 6, peso: 1.5, qtyV: [1, 3], venc: 120, lote: 12, codes: true },
];

const NOMBRES_CLIENTES = [
  ["María Fernanda Quispe Mamani", "maria.quispe@gmail.com", "6543218 CB"],
  ["Juan Carlos Rojas Vargas", "jcrojas@hotmail.com", "7123456 CB"],
  ["Rosa Elena Choque Flores", "rosa.choque@gmail.com", "5432167 CB"],
  ["Luis Alberto Mendoza Ríos", "lmendoza@outlook.com", "8234561 CB"],
  ["Carmen Lucía Vargas Soto", "carmen.vargas@gmail.com", "4321987 CB"],
  ["Pedro Antonio Condori Gutiérrez", "pcondori@gmail.com", "6789012 CB"],
  ["Ana Gabriela Torrez Peña", "ana.torrez@gmail.com", "7654321 CB"],
  ["Roberto Sánchez Aguilar", "rsanchez@gmail.com", "5123467 CB"],
  ["Silvia Patricia Herrera Lima", "silvia.herrera@gmail.com", "6234517 CB"],
  ["Diego Armando Cussi Paz", "dcussi@gmail.com", "8012345 CB"],
  ["Lidia Mamani Copa", "lidia.mamani@gmail.com", "3456712 CB"],
  ["Fabián Orellana Zeballos", "forellana@gmail.com", "7345612 CB"],
  ["Norma Beatriz Salazar Rocha", "norma.salazar@gmail.com", "5678123 CB"],
  ["Jhonny Villarroel Terceros", "jvillarroel@gmail.com", "6891234 CB"],
];

const USUARIOS_NUEVOS = [
  { primerNombre: "Lucía", apellidoPaterno: "Fernández", apellidoMaterno: "Soto", correo: "cajero@micromercado.com", celular: 70000002, rol: 2 },
  { primerNombre: "Marco", apellidoPaterno: "Choque", apellidoMaterno: "Quispe", correo: "almacen@micromercado.com", celular: 70000003, rol: 3 },
  { primerNombre: "Elena", apellidoPaterno: "Vargas", apellidoMaterno: "Rojas", correo: "reportes@micromercado.com", celular: 70000004, rol: 4 },
  { primerNombre: "Pedro", apellidoPaterno: "Condori", apellidoMaterno: "Mamani", correo: "compras@micromercado.com", celular: 70000005, rol: 5 },
];
const PASSWORD_DEMO = "Micro2026!";
const UNIDADES_BASE = [
  ["Unidad", "un"],
  ["Kilogramo", "kg"],
  ["Litro", "L"],
  ["Caja", "cj"],
  ["Bolsa", "bol"],
  ["Paquete", "paq"],
];

// ───────────────────────── programa principal ─────────────────────────
async function main() {
  const [{ db }] = await prisma.$queryRaw`SELECT DB_NAME() AS db`;

  console.log(`Base de datos: ${db}`);
  console.log(`Período de datos: ${INICIO.y}-${String(INICIO.m).padStart(2, "0")}-01 → ${HOY.y}-${String(HOY.m).padStart(2, "0")}-${String(HOY.d).padStart(2, "0")}`);
  if (!process.argv.includes("--confirmar")) {
    console.log("\nNo se cambió nada. Esto BORRARÍA los datos de esa base y los reemplazaría por datos de demostración.");
    console.log("Si es lo que quieres (y ya hiciste respaldo), vuelve a correrlo con --confirmar");
    await prisma.$disconnect();

    return;
  }
  const hash = await bcrypt.hash(PASSWORD_DEMO, 10);

  await prisma.$transaction(
    async (tx) => {
      // 1) BORRAR datos del negocio (orden seguro por claves foráneas)
      for (const m of [
        "solicitudCompraDetalle", "solicitudCompra", "notificacion", "anulacion", // avisos y solicitudes que dejan las pruebas
        "detalleVenta", "venta", "codigoBarrasItem", "stockVenta", "movimientoAlmacen", "lote",
        "detalleCompra", "compra", "conversionUnidad", "producto", "cliente", "proveedor", "categoria",
      ]) {
        await tx[m].deleteMany({});
      }
      await tx.unidadMedida.deleteMany({ where: { id: { gt: 7 } } }); // unidades basura de pruebas anteriores

      let admin = await tx.persona.findFirst({ where: { rol: 1, estado: 1 }, orderBy: { id: "asc" } });

      if (!admin) {
        admin = await tx.persona.create({
          data: {
            primerNombre: "Samuel",
            segundoNombre: null,
            apellidoPaterno: "Araoz",
            apellidoMaterno: "Administrador",
            correo: "admin@micromercado.com",
            celular: 70000001,
            contrase_a: hash,
            rol: 1,
            estado: 1,
            fechaRegistro: dt(2026, 5, 20),
          },
        });
      }

      await tx.persona.deleteMany({ where: { id: { not: admin.id } } });

      for (const t of ["Categoria", "Cliente", "CodigoBarrasItem", "Compra", "ConversionUnidad", "DetalleCompra",
        "DetalleVenta", "Lote", "MovimientoAlmacen", "Producto", "Proveedor", "StockVenta", "Venta"]) {
        await tx.$executeRawUnsafe(`DBCC CHECKIDENT ('${t}', RESEED, 0)`);
      }

      // 2) usuarios: se conserva el administrador y se crean los otros 4 roles
      const u = {};

      u.admin = admin.id;
      for (const nu of USUARIOS_NUEVOS) {
        const p = await tx.persona.create({
          data: { ...nu, contrase_a: hash, estado: 1, fechaRegistro: dt(2026, 5, 20), usuarioIdRegistro: admin.id },
        });

        u[{ 2: "cajero", 3: "almacen", 4: "reportes", 5: "compras" }[nu.rol]] = p.id;
      }

      // 3) unidades: una base nueva no tiene datos precargados
      for (const [nombre, abreviatura] of UNIDADES_BASE) {
        await tx.unidadMedida.upsert({
          where: { id: UNIDADES_BASE.findIndex(([n]) => n === nombre) + 1 },
          update: { nombre, abreviatura, estado: 1 },
          create: { nombre, abreviatura, estado: 1 },
        });
      }

      const unidades = {};

      for (const un of await tx.unidadMedida.findMany()) unidades[un.nombre] = un.id;

      // 4) categorías, proveedores, clientes
      const cat = {};

      for (const n of CATEGORIAS) cat[n] = (await tx.categoria.create({ data: { nombre: n, estado: 1, fechaRegistro: dt(2026, 5, 20), usuarioIdRegistro: admin.id } })).id;

      const prov = [];

      for (const p of PROVEEDORES) prov.push((await tx.proveedor.create({ data: { ...p, estado: 1, fechaRegistro: dt(2026, 5, 20), usuarioIdRegistro: admin.id } })).id);

      const clienteGeneral = await tx.cliente.create({
        data: { carnet: "0", nombre: "Cliente general", correo: "", estado: 1, fechaRegistro: dt(2026, 5, 20), usuarioIdRegistro: admin.id },
      });
      const clientes = [];

      for (const [nombre, correo, carnet] of NOMBRES_CLIENTES) {
        clientes.push(await tx.cliente.create({ data: { carnet, nombre, correo, estado: 1, fechaRegistro: dt(2026, 5, 22), usuarioIdRegistro: u.cajero } }));
      }

      // 5) productos con sus conversiones
      const P = {};

      for (const pr of PRODUCTOS) {
        const baseId = unidades[pr.base];
        const created = await tx.producto.create({
          data: {
            nombre: pr.nombre, descripcion: pr.desc, categoriaID: cat[pr.cat], proveedorID: prov[pr.prov],
            unidadBaseID: baseId, stockMinimo: pr.min, estado: 1, fechaRegistro: dt(2026, 5, 21), usuarioRegistro: admin.id,
            ConversionUnidad: {
              create: [
                { unidadOrigenID: baseId, unidadDestinoID: baseId, factorConversion: 1, precioVentaUnitario: pr.precio, estado: 1 },
                ...pr.packs.map((k) => ({ unidadOrigenID: unidades[k.u], unidadDestinoID: baseId, factorConversion: k.factor, precioVentaUnitario: k.precio, estado: 1 })),
              ],
            },
          },
        });

        P[pr.key] = { ...pr, id: created.id, baseId, compraUnidadId: unidades[pr.compra.u], lotes: [], estante: [], seq: 0 };
      }
      const lista = Object.values(P);

      // ───── simulación cronológica ─────
      let compraSeq = 0;

      const vigente = (venc, fecha) => !venc || venc.getTime() >= soloFecha(fecha).getTime(); // vence hoy: aún sirve
      const almacenDisp = (p, fecha) => p.lotes.filter((l) => vigente(l.venc, fecha)).reduce((s, l) => s + (l.inicial - l.extraido), 0);

      async function comprar(provIdx, fecha) {
        const prods = lista.filter((p) => p.prov === provIdx);
        const lineas = [];

        for (const p of prods) {
          const almacen = almacenDisp(p, fecha);

          if (almacen > p.lote * 1.6) continue; // todavía hay de sobra
          const qty = rint(p.compra.qty[0], p.compra.qty[1]);
          const bruto = qty * p.compra.costo;
          const descuento = rnd() < 0.15 ? round2(bruto * 0.03) : 0;

          lineas.push({ p, qty, bruto, descuento });
        }
        if (lineas.length === 0) return;

        const subtotal = lineas.reduce((s, l) => s + l.bruto, 0);
        const descTotal = lineas.reduce((s, l) => s + l.descuento, 0);
        const numero = `COMP-${ymd(fecha)}-${String(++compraSeq * 137 + rint(100, 999)).padStart(6, "0")}`;

        const compra = await tx.compra.create({
          data: {
            numeroCompra: numero, proveedorID: prov[provIdx], subtotal, descuento: descTotal, total: round2(subtotal - descTotal),
            estado: 1, usuarioIdRegistro: u.compras, fechaRegistro: fecha,
            DetalleCompra: {
              create: lineas.map((l) => ({
                productoID: l.p.id, unidadMedidaID: l.p.compraUnidadId, cantidadComprada: l.qty, precioUnitario: l.p.compra.costo,
                subtotal: l.bruto, descuento: l.descuento, total: round2(l.bruto - l.descuento), estado: 1,
                Lote: {
                  create: {
                    numeroLote: `L${ymd(fecha).slice(2)}-${String(l.p.id).padStart(2, "0")}`, productoID: l.p.id,
                    fechaVencimiento: l.p.venc ? soloFecha(addDays(fecha, l.p.venc + (l.p.venc < 60 ? rint(-3, 3) : 0))) : null,
                    cantidadInicialUnidadesBase: l.qty * l.p.compra.factor, estado: 1, fechaRegistro: fecha, usuarioIdRegistro: u.compras,
                  },
                },
              })),
            },
          },
          include: { DetalleCompra: { include: { Lote: true } } },
        });

        for (const d of compra.DetalleCompra) {
          const l = lineas.find((x) => x.p.id === d.productoID);
          const lote = d.Lote[0];

          l.p.lotes.push({ id: lote.id, inicial: l.qty * l.p.compra.factor, extraido: 0, venc: lote.fechaVencimiento, fecha });
          await tx.movimientoAlmacen.create({
            data: {
              tipoMovimiento: 1, productoID: l.p.id, loteID: lote.id, unidadMedidaID: l.p.compraUnidadId, cantidad: l.qty,
              cantidadUnidadesBase: l.qty * l.p.compra.factor, referenciaID: compra.id, tipoReferencia: 1,
              observaciones: `Ingreso por compra ${numero}`, fechaRegistro: fecha, usuarioIdRegistro: u.compras,
            },
          });
        }
      }

      async function extraer(p, fecha, objetivo) {
        let falta = objetivo;
        const lotes = p.lotes.filter((l) => l.inicial - l.extraido > 0 && vigente(l.venc, fecha)).sort((a, b) => (a.venc ? a.venc.getTime() : 9e15) - (b.venc ? b.venc.getTime() : 9e15));

        for (const l of lotes) {
          if (falta <= 0) break;
          const cant = Math.min(falta, l.inicial - l.extraido);

          l.extraido += cant;
          falta -= cant;

          const sv = await tx.stockVenta.create({
            data: {
              productoID: p.id, loteID: l.id, unidadMedidaID: p.baseId, cantidadDisponible: cant, cantidadUnidadesBase: cant,
              precioVenta: p.precio, fechaVencimiento: l.venc, estado: 1, fechaRegistro: fecha, usuarioRegistro: u.almacen,
            },
          });
          const linea = { id: sv.id, disp: cant, precio: p.precio, venc: l.venc, fecha, codes: [] };

          if (p.codes) {
            for (let i = 0; i < cant; i++) {
              const codigo = `779${String(p.id).padStart(2, "0")}${String(sv.id).padStart(4, "0")}${String(i + 1).padStart(3, "0")}`;
              const c = await tx.codigoBarrasItem.create({ data: { stockVentaID: sv.id, codigoBarras: codigo, estado: 1, fechaRegistro: fecha, usuarioRegistro: u.almacen } });

              linea.codes.push({ id: c.id, usado: false });
            }
          }
          p.estante.push(linea);
          await tx.movimientoAlmacen.create({
            data: {
              tipoMovimiento: 2, productoID: p.id, loteID: l.id, unidadMedidaID: p.baseId, cantidad: cant, cantidadUnidadesBase: cant,
              observaciones: `Salida para venta - Stock ID: ${sv.id}`, fechaRegistro: fecha, usuarioIdRegistro: u.almacen,
            },
          });
        }
      }

      const enEstante = (p, fecha) => p.estante.filter((s) => s.fecha <= fecha && s.disp > 0 && vigente(s.venc, fecha)).reduce((s, x) => s + x.disp, 0);

      /** Toma `qty` unidades del estante (más próximo a vencer primero). Devuelve las líneas de detalle. */
      function tomar(p, qty, fecha) {
        const lineas = p.estante.filter((s) => s.fecha <= fecha && s.disp > 0 && vigente(s.venc, fecha)).sort((a, b) => (a.venc ? a.venc.getTime() : 9e15) - (b.venc ? b.venc.getTime() : 9e15));
        const out = [];
        let falta = qty;

        for (const s of lineas) {
          if (falta <= 0) break;
          if (p.codes) {
            while (falta > 0 && s.disp > 0) {
              const c = s.codes.find((x) => !x.usado);

              if (!c) break;
              c.usado = true;
              s.disp -= 1;
              falta -= 1;
              out.push({ stock: s, cantidad: 1, codigoId: c.id });
            }
          } else {
            const cant = Math.min(falta, s.disp);

            s.disp -= cant;
            falta -= cant;
            out.push({ stock: s, cantidad: cant, codigoId: null });
          }
        }

        return out;
      }

      // stock inicial: compras de fines de mayo y traslados al estante
      for (let i = 0; i < PROVEEDORES.length; i++) await comprar(i, dt(2026, 5, 29, 10, 0));
      for (const p of lista) await extraer(p, dt(2026, 5, 30, 9, 0), p.lote);

      // días de operación: lunes a sábado
      let ventaSeq = 0;
      const totales = {};
      const clientesPeso = [...clientes, ...clientes.slice(0, 4), ...clientes.slice(0, 2)]; // algunos compran más seguido

      for (let f = dt(INICIO.y, INICIO.m, INICIO.d, 0, 0); f <= dt(HOY.y, HOY.m, HOY.d, 0, 0); f = addDays(f, 1)) {
        const dow = f.getUTCDay();

        if (dow === 0) continue; // domingo cerrado
        const progreso = (f.getTime() - dt(INICIO.y, INICIO.m, INICIO.d).getTime()) / (dt(HOY.y, HOY.m, HOY.d).getTime() - dt(INICIO.y, INICIO.m, INICIO.d).getTime());
        const base = dow === 6 ? rint(5, 8) : dow === 5 ? rint(3, 6) : rint(2, 4);
        const nVentas = Math.max(1, Math.round(base * (0.85 + 0.4 * progreso)));
        const esHoy = f.getTime() === dt(HOY.y, HOY.m, HOY.d).getTime();

        for (let v = 0; v < nVentas; v++) {
          const hora = pickW([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], [2, 3, 3, 3, 2, 2, 3, 4, 5, 5, 4, 3, 1]);
          if (esHoy && hora > 15) continue;
          const fecha = dt(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate(), hora, rint(0, 59));
          const nLineas = pickW([1, 2, 3, 4, 5], [3, 4, 3, 2, 1]);
          const elegidos = new Set();
          const detalles = [];

          for (let k = 0; k < nLineas; k++) {
            const p = pickW(lista, lista.map((x) => x.peso));

            if (elegidos.has(p.key)) continue;
            elegidos.add(p.key);
            const qty = rint(p.qtyV[0], p.qtyV[1]);

            // reponer si no alcanza: primero del almacén, y si tampoco hay, una compra
            if (enEstante(p, fecha) < qty) {
              const almacen = almacenDisp(p, fecha);

              if (almacen < p.lote) await comprar(p.prov, dt(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate(), 7, 30));
              await extraer(p, dt(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate(), 7, 50), p.lote);
            }
            const tomado = tomar(p, qty, fecha);

            for (const t of tomado) {
              const sub = round2(t.cantidad * t.stock.precio);
              const desc = rnd() < 0.1 && t.cantidad >= 2 ? round2(Math.min(sub * 0.08, 3)) : 0;

              detalles.push({ stockVentaID: t.stock.id, codigoBarrasItemID: t.codigoId, cantidadVendida: t.cantidad, cantidadUnidadesBase: t.cantidad,
                precioUnitario: t.stock.precio, subtotal: sub, descuento: desc, total: round2(sub - desc) });
            }
          }
          if (detalles.length === 0) continue;

          const subtotal = round2(detalles.reduce((s, d) => s + d.subtotal, 0));
          const descuento = round2(detalles.reduce((s, d) => s + d.descuento, 0));
          const total = round2(subtotal - descuento);
          // El sistema solo cobra en EFECTIVO (el documento no contempla tarjeta ni transferencia): metodoPago = 1 siempre
          const metodo = 1;
          const recibido = Math.max(total, Math.ceil(total / pick([5, 10, 50])) * pick([5, 10]));
          const cliente = rnd() < 0.35 ? clienteGeneral : pick(clientesPeso);
          const vendedor = rnd() < 0.72 ? u.cajero : u.admin;

          await tx.venta.create({
            data: {
              numeroVenta: `VENTA-${ymd(fecha)}-${String(100000 + ++ventaSeq * 7 + rint(0, 6)).slice(-6)}`,
              clienteID: cliente.id, subtotal, descuento, impuestos: 0, total, montoRecibido: round2(Math.max(recibido, total)),
              cambio: round2(Math.max(recibido, total) - total), metodoPago: metodo, estado: 1, fechaVenta: fecha, usuarioRegistro: vendedor,
              DetalleVenta: { create: detalles },
            },
          });
          const mes = fecha.toISOString().slice(0, 7);

          totales[mes] = totales[mes] || { ventas: 0, n: 0 };
          totales[mes].ventas += total;
          totales[mes].n += 1;
        }
      }

      // estado final del estante (lo que quedó después de las ventas)
      for (const p of lista) {
        for (const s of p.estante) {
          await tx.stockVenta.update({
            where: { id: s.id },
            data: { cantidadDisponible: s.disp, cantidadUnidadesBase: s.disp, estado: s.disp > 0 ? 1 : 2 },
          });
          for (const c of s.codes) if (c.usado) await tx.codigoBarrasItem.update({ where: { id: c.id }, data: { estado: 2 } });
        }
      }

      console.log("\nVentas por mes (demo):");
      for (const [mes, t] of Object.entries(totales)) console.log(`  ${mes}: ${t.n} ventas · Bs. ${round2(t.ventas)}`);
    },
    { timeout: 1_800_000, maxWait: 60_000 },
  );

  const resumen = {
    usuarios: await prisma.persona.count(), categorias: await prisma.categoria.count(), proveedores: await prisma.proveedor.count(),
    clientes: await prisma.cliente.count(), productos: await prisma.producto.count(), compras: await prisma.compra.count(),
    lotes: await prisma.lote.count(), movimientos: await prisma.movimientoAlmacen.count(), stockEstante: await prisma.stockVenta.count(),
    ventas: await prisma.venta.count(), detallesVenta: await prisma.detalleVenta.count(),
  };

  console.log("\nDatos creados:", resumen);
  console.log(`\nContraseña de los usuarios nuevos: ${PASSWORD_DEMO}`);
}

main()
  .catch((e) => {
    console.error("\nERROR (no se aplicó ningún cambio):", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
