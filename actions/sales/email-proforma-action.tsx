"use server";
import nodemailer from 'nodemailer';
import { render } from "@react-email/components";
import ProformaEmail from "../email/ProformaEmail";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getBoliviaTime } from '@/src/utils/date';
import { LOGO_PROFORMA_BASE64 } from '@/src/lib/logo-proforma';

// Remitente: SMTP_FROM si existe; si no, el usuario SMTP (o el GMAIL_EMAIL de antes)
const REMITENTE = (process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_EMAIL || 'micromercado.anita@gmail.com') as string;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EnviarProformaParams {
  venta: {
    id: number;
    numeroVenta: string;
    subtotal: number;
    descuento: number;
    total: number;
    montoRecibido: number;
    cambio: number;
  };
  cliente: {
    nombre: string;
    correo: string;
    carnet?: string;
  };
  items: Array<{
    id: number;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
    total: number;
  }>;
}

export async function enviarProformaPorCorreo({
  venta,
  cliente,
  items,
}: EnviarProformaParams) {
  try {
    const pdfBuffer = await generarPDFConPDFLib({ venta, cliente, items });

    const { fecha, hora } = fechaHoraBolivia();
    const datosCorreo = {
      clienteNombre: cliente.nombre,
      numeroVenta: venta.numeroVenta,
      fecha: `${fecha} ${hora}`,
      total: venta.total,
      cantidadProductos: items.length,
      contacto: REMITENTE,
      telefono: process.env.NEGOCIO_TELEFONO,
    };
    const emailHtml = await render(ProformaEmail(datosCorreo));
    const emailTexto = await render(ProformaEmail(datosCorreo), { plainText: true });

    const mailOptions = {
      from: {
        name: 'MicroMercado Anita',
        address: REMITENTE
      },
      to: cliente.correo,
      subject: `Su proforma N.º ${venta.numeroVenta} · MicroMercado Anita`,
      html: emailHtml,
      text: emailTexto,
      attachments: [
        {
          filename: `proforma-${venta.numeroVenta}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        },
      ],
    };

    const result = await transporter.sendMail(mailOptions);

    return {
      success: true,
      data: {
        messageId: result.messageId,
        mensaje: "Proforma enviada exitosamente",
      },
    };
  } catch (error) {
    console.error("Error al enviar email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Helvetica estándar solo dibuja Latin-1: lo demás se cambia por "?" en vez de hacer fallar el correo
const limpiar = (s: string) => (s ?? '').replace(/[^\x20-\x7E -ÿ]/g, '?');

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha y hora de Bolivia (getBoliviaTime ya viene ajustada: se lee en UTC) */
function fechaHoraBolivia() {
  const d = getBoliviaTime();

  return {
    fecha: `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
    hora: `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`,
  };
}

const bs = (n: number) => `Bs ${n.toFixed(2)}`;

async function generarPDFConPDFLib({ venta, cliente, items }: EnviarProformaParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const W = 595;
  const H = 842;
  const M = 48; // margen
  const DER = W - M;

  let page = pdfDoc.addPage([W, H]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const azul = rgb(0.043, 0.227, 0.333); // #0B3A55
  const naranja = rgb(0.949, 0.416, 0.063); // #F26A10
  const texto = rgb(0.13, 0.15, 0.18);
  const gris = rgb(0.42, 0.45, 0.5);
  const lineaSuave = rgb(0.86, 0.88, 0.9);
  const fondoSuave = rgb(0.965, 0.973, 0.98);
  const rojo = rgb(0.75, 0.12, 0.12);
  const verde = rgb(0.1, 0.5, 0.25);
  const blanco = rgb(1, 1, 1);

  const { fecha, hora } = fechaHoraBolivia();

  const derecha = (t: string, xDer: number, y: number, size: number, f = font, color = texto) =>
    page.drawText(t, { x: xDer - f.widthOfTextAtSize(t, size), y, size, font: f, color });

  const recortar = (t: string, ancho: number, size: number, f = font) => {
    let s = limpiar(t);

    if (f.widthOfTextAtSize(s, size) <= ancho) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + '...', size) > ancho) s = s.slice(0, -1);

    return s.trimEnd() + '...';
  };

  // ========== ENCABEZADO ==========
  let y = H - M;

  try {
    const logo = await pdfDoc.embedPng(Buffer.from(LOGO_PROFORMA_BASE64, 'base64'));

    page.drawImage(logo, { x: M, y: y - 56, width: 56, height: 56 });
  } catch {
    // sin logo: el encabezado sigue funcionando
  }

  page.drawText('MicroMercado Anita', { x: M + 68, y: y - 22, size: 20, font: bold, color: azul });
  page.drawText('Tu tienda de confianza', { x: M + 68, y: y - 38, size: 9.5, font, color: gris });
  page.drawText('Cochabamba, Bolivia', { x: M + 68, y: y - 51, size: 9, font, color: gris });

  derecha('PROFORMA DE VENTA', DER, y - 18, 15, bold, azul);
  derecha(`N.º ${limpiar(venta.numeroVenta)}`, DER, y - 35, 10.5, bold, texto);
  derecha(`Fecha: ${fecha}  ·  Hora: ${hora}`, DER, y - 49, 9, font, gris);

  y -= 68;
  page.drawRectangle({ x: M, y, width: DER - M, height: 2.5, color: azul });
  page.drawRectangle({ x: M, y: y - 2.5, width: 70, height: 2.5, color: naranja });

  // ========== CLIENTE ==========
  y -= 22;
  const altoCliente = 52;

  page.drawRectangle({ x: M, y: y - altoCliente, width: DER - M, height: altoCliente, color: fondoSuave, borderColor: lineaSuave, borderWidth: 0.8 });
  page.drawText('CLIENTE', { x: M + 14, y: y - 15, size: 8, font: bold, color: naranja });
  page.drawText(recortar(cliente.nombre, 300, 12, bold), { x: M + 14, y: y - 31, size: 12, font: bold, color: texto });

  const datosCliente = [cliente.carnet && cliente.carnet !== '0' ? `Carnet: ${cliente.carnet}` : null, cliente.correo].filter(Boolean).join('   ·   ');

  page.drawText(recortar(datosCliente, 330, 9), { x: M + 14, y: y - 44, size: 9, font, color: gris });

  derecha('FORMA DE PAGO', DER - 14, y - 15, 8, bold, naranja);
  derecha('Efectivo', DER - 14, y - 31, 11, bold, texto);
  derecha('Atendido en caja', DER - 14, y - 44, 9, font, gris);

  // ========== TABLA ==========
  y -= altoCliente + 26;

  const xNum = M + 8;
  const xDesc = M + 30;
  const xCant = 352;
  const xPUnit = 424;
  const xDescuento = 488;
  const xTotal = DER - 8;

  const cabeceraTabla = () => {
    page.drawRectangle({ x: M, y: y - 22, width: DER - M, height: 22, color: azul });
    page.drawText('N.º', { x: xNum, y: y - 15, size: 8.5, font: bold, color: blanco });
    page.drawText('DESCRIPCIÓN', { x: xDesc, y: y - 15, size: 8.5, font: bold, color: blanco });
    derecha('CANT.', xCant, y - 15, 8.5, bold, blanco);
    derecha('P. UNIT.', xPUnit, y - 15, 8.5, bold, blanco);
    derecha('DESC.', xDescuento, y - 15, 8.5, bold, blanco);
    derecha('TOTAL', xTotal, y - 15, 8.5, bold, blanco);
    y -= 22;
  };

  const nuevaPagina = (conTabla: boolean) => {
    page = pdfDoc.addPage([W, H]);
    y = H - M;
    page.drawText(`Proforma N.º ${limpiar(venta.numeroVenta)} (continuación)`, { x: M, y: y - 12, size: 11, font: bold, color: azul });
    y -= 34;
    if (conTabla) cabeceraTabla();
  };

  cabeceraTabla();

  const ALTO_FILA = 24;
  const cantidadTexto = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

  items.forEach((item, i) => {
    if (y < 190) nuevaPagina(true);

    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - ALTO_FILA, width: DER - M, height: ALTO_FILA, color: fondoSuave });

    const base = y - 16;
    const desc = item.descuento || 0;

    page.drawText(String(i + 1), { x: xNum, y: base, size: 9, font, color: gris });
    page.drawText(recortar(item.productoNombre, xCant - 70 - xDesc, 9.5), { x: xDesc, y: base, size: 9.5, font, color: texto });
    derecha(cantidadTexto(item.cantidad), xCant, base, 9.5);
    derecha(item.precioUnitario.toFixed(2), xPUnit, base, 9.5);
    derecha(desc > 0 ? `- ${desc.toFixed(2)}` : '-', xDescuento, base, 9.5, font, desc > 0 ? rojo : gris);
    derecha(item.total.toFixed(2), xTotal, base, 9.5, bold);

    y -= ALTO_FILA;
  });

  page.drawLine({ start: { x: M, y }, end: { x: DER, y }, thickness: 0.8, color: lineaSuave });

  // ========== TOTALES (pegados a la tabla) ==========
  if (y < 250) nuevaPagina(false);
  y -= 24;

  const xEtiqueta = 340;
  const xValor = DER - 8;
  const fila = (etiqueta: string, valor: string, color = texto, f = font, size = 10) => {
    page.drawText(etiqueta, { x: xEtiqueta, y, size, font: f, color: gris });
    derecha(valor, xValor, y, size, f, color);
    y -= 18;
  };

  // Nota a la izquierda
  page.drawText('Esta proforma es un comprobante informativo de su compra', { x: M, y, size: 8.5, font, color: gris });
  page.drawText('y no constituye factura.', { x: M, y: y - 11, size: 8.5, font, color: gris });

  fila('Subtotal', bs(venta.subtotal));
  if (venta.descuento > 0) fila('Descuento', `- ${bs(venta.descuento)}`, rojo);

  y -= 12;
  page.drawRectangle({ x: xEtiqueta - 12, y: y - 9, width: DER - xEtiqueta + 12, height: 30, color: azul });
  page.drawText('TOTAL A PAGAR', { x: xEtiqueta, y: y + 1, size: 10, font: bold, color: blanco });
  derecha(bs(venta.total), xValor, y + 1, 13, bold, blanco);
  y -= 34;

  fila('Monto recibido', bs(venta.montoRecibido));
  fila('Cambio', bs(venta.cambio), verde, bold, 10.5);

  // ========== PIE (en cada hoja) ==========
  const contacto = [process.env.NEGOCIO_TELEFONO ? `Tel. ${process.env.NEGOCIO_TELEFONO}` : null, REMITENTE].filter(Boolean).join('  ·  ');
  const paginas = pdfDoc.getPages();

  paginas.forEach((pg, idx) => {
    pg.drawRectangle({ x: M, y: 74, width: DER - M, height: 1, color: lineaSuave });
    pg.drawText('¡Gracias por su compra!', { x: M, y: 58, size: 10.5, font: bold, color: azul });
    pg.drawText(limpiar(`MicroMercado Anita  ·  Cochabamba, Bolivia  ·  ${contacto}`), { x: M, y: 44, size: 8, font, color: gris });
    const num = `Página ${idx + 1} de ${paginas.length}`;

    pg.drawText(num, { x: DER - font.widthOfTextAtSize(num, 8), y: 44, size: 8, font, color: gris });
  });

  return await pdfDoc.save();
}
