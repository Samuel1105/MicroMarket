"use server";
import nodemailer from 'nodemailer';
import { render } from "@react-email/components";
import ProformaEmail from "../email/ProformaEmail";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
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

    const emailHtml = await render(
      ProformaEmail({
        clienteNombre: cliente.nombre,
        numeroVenta: venta.numeroVenta,
        pdfUrl: "#",
      })
    );

    const mailOptions = {
      from: {
        name: 'MicroMercado Anita',
        address: process.env.GMAIL_EMAIL!
      },
      to: cliente.correo,
      subject: `Proforma #${venta.numeroVenta} - MicroMercado Anita`,
      html: emailHtml,
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

async function generarPDFConPDFLib({ venta, cliente, items }: EnviarProformaParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Colores profesionales
  const primaryColor = rgb(0.102, 0.227, 0.424); // Azul oscuro profesional
  const secondaryColor = rgb(0.941, 0.502, 0.502); // Rosa suave
  const accentColor = rgb(0.8, 0.1, 0.1); // Rojo para descuentos
  const successColor = rgb(0.2, 0.6, 0.2); // Verde para cambio
  const lightGray = rgb(0.95, 0.95, 0.95);
  const darkText = rgb(0.2, 0.2, 0.2);
  const mediumGray = rgb(0.5, 0.5, 0.5);
  
  // ========== MARCA DE AGUA ==========
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Image', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoArray = Uint8Array.from(logoBytes);
      const logoImage = await pdfDoc.embedPng(logoArray);
      
      const logoSize = 250;
      const logoDims = logoImage.scale(logoSize / logoImage.width);
      
      const logoX = (width - logoDims.width) / 2;
      const logoY = (height - logoDims.height) / 2;
      
      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoDims.width,
        height: logoDims.height,
        opacity: 0.06,
      });
    }
  } catch (error) {
    console.log('Logo no encontrado, continuando sin marca de agua');
  }
  
  // ========== ENCABEZADO PROFESIONAL ==========
  let yPos = height - 60;
  
  // Nombre de la empresa
  page.drawText('MicroMercado Anita', {
    x: 50,
    y: yPos,
    size: 26,
    font: boldFont,
    color: primaryColor,
  });
  
  yPos -= 20;
  
  page.drawText('Tu tienda de confianza', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: mediumGray,
  });
  
  // Línea decorativa
  yPos -= 15;
  page.drawLine({
    start: { x: 50, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 2,
    color: primaryColor,
  });
  
  // Información de la proforma (derecha)
  const proformaY = height - 60;
  page.drawText('PROFORMA', {
    x: width - 200,
    y: proformaY,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText(`# ${venta.numeroVenta}`, {
    x: width - 200,
    y: proformaY - 20,
    size: 11,
    font: boldFont,
    color: darkText,
  });
  
  const fechaActual = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  page.drawText(`Fecha: ${fechaActual}`, {
    x: width - 200,
    y: proformaY - 35,
    size: 9,
    font: font,
    color: mediumGray,
  });
  
  // ========== INFORMACIÓN DEL CLIENTE ==========
  yPos -= 40;
  
  // Caja con fondo para info del cliente
  page.drawRectangle({
    x: 50,
    y: yPos - 50,
    width: width - 100,
    height: 60,
    color: lightGray,
    borderColor: primaryColor,
    borderWidth: 1,
  });
  
  page.drawText('CLIENTE', {
    x: 60,
    y: yPos - 15,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText(cliente.nombre, {
    x: 60,
    y: yPos - 32,
    size: 11,
    font: boldFont,
    color: darkText,
  });
  
  page.drawText(cliente.correo, {
    x: 60,
    y: yPos - 47,
    size: 9,
    font: font,
    color: mediumGray,
  });
  
  // ========== TABLA DE PRODUCTOS ==========
  yPos -= 90;
  
  // Encabezado de tabla con fondo
  page.drawRectangle({
    x: 50,
    y: yPos - 20,
    width: width - 100,
    height: 25,
    color: primaryColor,
  });
  
  page.drawText('DESCRIPCIÓN', {
    x: 60,
    y: yPos - 13,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText('CANT', {
    x: 320,
    y: yPos - 13,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText('P. UNIT', {
    x: 375,
    y: yPos - 13,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText('DESC', {
    x: 440,
    y: yPos - 13,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText('TOTAL', {
    x: 490,
    y: yPos - 13,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  yPos -= 30;
  
  // Items de la venta
  items.forEach((item, index) => {
    // Línea separadora sutil
    if (index > 0) {
      page.drawLine({
        start: { x: 50, y: yPos + 12 },
        end: { x: width - 50, y: yPos + 12 },
        thickness: 0.5,
        color: lightGray,
      });
    }
    
    // Nombre del producto
    const maxLength = 35;
    const nombre = item.productoNombre.length > maxLength
      ? item.productoNombre.substring(0, maxLength) + '...'
      : item.productoNombre;
    
    page.drawText(nombre, {
      x: 60,
      y: yPos,
      size: 9,
      font: font,
      color: darkText,
    });
    
    // Cantidad
    page.drawText(item.cantidad.toString(), {
      x: 330,
      y: yPos,
      size: 9,
      font: font,
      color: darkText,
    });
    
    // Precio unitario
    page.drawText(item.precioUnitario.toFixed(2), {
      x: 380,
      y: yPos,
      size: 9,
      font: font,
      color: darkText,
    });
    
    // Descuento
    const descuento = item.descuento || 0;
    page.drawText(descuento.toFixed(2), {
      x: 445,
      y: yPos,
      size: 9,
      font: font,
      color: descuento > 0 ? accentColor : mediumGray,
    });
    
    // Total
    page.drawText(item.total.toFixed(2), {
      x: 495,
      y: yPos,
      size: 9,
      font: boldFont,
      color: darkText,
    });
    
    yPos -= 20;
  });
  
  // ========== RESUMEN DE TOTALES ==========
  yPos -= 20;
  
  // Línea superior
  page.drawLine({
    start: { x: 350, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 1.5,
    color: primaryColor,
  });
  
  yPos -= 25;
  
  // Subtotal
  page.drawText('Subtotal:', {
    x: 380,
    y: yPos,
    size: 10,
    font: font,
    color: darkText,
  });
  
  page.drawText(`Bs ${venta.subtotal.toFixed(2)}`, {
    x: 480,
    y: yPos,
    size: 10,
    font: font,
    color: darkText,
  });
  
  yPos -= 18;
  
  // Descuento (si existe)
  if (venta.descuento > 0) {
    page.drawText('Descuento:', {
      x: 380,
      y: yPos,
      size: 10,
      font: font,
      color: darkText,
    });
    
    page.drawText(`- Bs ${venta.descuento.toFixed(2)}`, {
      x: 480,
      y: yPos,
      size: 10,
      font: font,
      color: accentColor,
    });
    
    yPos -= 20;
  } else {
    yPos -= 2;
  }
  
  // Línea antes del total
  page.drawLine({
    start: { x: 350, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 0.5,
    color: mediumGray,
  });
  
  yPos -= 22;
  
  // Total destacado
  page.drawRectangle({
    x: 365,
    y: yPos - 5,
    width: width - 415,
    height: 28,
    color: rgb(0.95, 0.97, 1),
    borderColor: primaryColor,
    borderWidth: 1.5,
  });
  
  page.drawText('TOTAL:', {
    x: 380,
    y: yPos + 5,
    size: 13,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText(`Bs ${venta.total.toFixed(2)}`, {
    x: 470,
    y: yPos + 5,
    size: 13,
    font: boldFont,
    color: accentColor,
  });
  
  yPos -= 40;
  
  // ========== INFORMACIÓN DE PAGO ==========
  page.drawLine({
    start: { x: 50, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 0.5,
    color: lightGray,
  });
  
  yPos -= 20;
  
  page.drawText('Monto Recibido:', {
    x: 380,
    y: yPos,
    size: 10,
    font: font,
    color: darkText,
  });
  
  page.drawText(`Bs ${venta.montoRecibido.toFixed(2)}`, {
    x: 480,
    y: yPos,
    size: 10,
    font: font,
    color: darkText,
  });
  
  yPos -= 22;
  
  // Cambio destacado
  page.drawRectangle({
    x: 365,
    y: yPos - 5,
    width: width - 415,
    height: 26,
    color: rgb(0.93, 0.98, 0.93),
    borderColor: successColor,
    borderWidth: 1.5,
  });
  
  page.drawText('Cambio:', {
    x: 380,
    y: yPos + 4,
    size: 11,
    font: boldFont,
    color: darkText,
  });
  
  page.drawText(`Bs ${venta.cambio.toFixed(2)}`, {
    x: 480,
    y: yPos + 4,
    size: 11,
    font: boldFont,
    color: successColor,
  });
  
  // ========== PIE DE PÁGINA ==========
  const footerY = 70;
  
  // Línea superior
  page.drawLine({
    start: { x: 50, y: footerY + 30 },
    end: { x: width - 50, y: footerY + 30 },
    thickness: 1.5,
    color: primaryColor,
  });
  
  // Mensaje de agradecimiento
  page.drawText('¡Gracias por tu compra!', {
    x: 50,
    y: footerY + 10,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });
  
  // Información de contacto
  page.drawText('Email: anita@gmail.com', {
    x: 50,
    y: footerY - 5,
    size: 8,
    font: font,
    color: mediumGray,
  });
  
  // Dirección
  page.drawText('Cochabamba, Bolivia', {
    x: 50,
    y: footerY - 18,
    size: 8,
    font: font,
    color: mediumGray,
  });
  
  return await pdfDoc.save();
}