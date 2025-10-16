"use server";
import nodemailer from 'nodemailer';
import { render } from "@react-email/components";
import ProformaEmail from "../email/ProformaEmail";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Configuración del transporter de Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL, // tu-email@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación de 16 dígitos
  },
});

interface EnviarProformaParams {
  venta: {
    id: number;
    numeroVenta: string;
    total: number;
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
    total: number;
  }>;
}

export async function enviarProformaPorCorreo({
  venta,
  cliente,
  items,
}: EnviarProformaParams) {
  try {
    // 1. Generar PDF
    const pdfBuffer = await generarPDFConPDFLib({ venta, cliente, items });

    // 2. Renderizar el email
    const emailHtml = await render(
      ProformaEmail({
        clienteNombre: cliente.nombre,
        numeroVenta: venta.numeroVenta,
        pdfUrl: "#",
      })
    );

    // 3. Configurar opciones del email con el tipo correcto
    const mailOptions = {
      from: {
        name: 'Tu Empresa',
        address: process.env.GMAIL_EMAIL!
      },
      to: cliente.correo,
      subject: `Proforma #${venta.numeroVenta} - Gracias por tu compra`,
      html: emailHtml,
      attachments: [
        {
          filename: `proforma-${venta.numeroVenta}.pdf`,
          content: Buffer.from(pdfBuffer), // Convert Uint8Array to Buffer
          contentType: 'application/pdf'
        },
      ],
    };

    // 4. Enviar email y esperar la respuesta
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
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Color corporativo (azul profesional)
  const primaryColor = rgb(0.1, 0.3, 0.6);
  const accentColor = rgb(0.8, 0.1, 0.1);
  const lightGray = rgb(0.9, 0.9, 0.9);
  const darkGray = rgb(0.3, 0.3, 0.3);
  
  // Logo y encabezado
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: primaryColor,
  });
  
  // Nombre de la empresa
  page.drawText('MI EMPRESA', {
    x: 50,
    y: height - 40,
    size: 24,
    font: titleFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText('Soluciones Profesionales', {
    x: 50,
    y: height - 65,
    size: 12,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  // Número de proforma y fecha
  const fechaActual = new Date().toLocaleDateString('es-ES');
  
  page.drawText(`PROFORMA #${venta.numeroVenta}`, {
    x: width - 200,
    y: height - 40,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText(`Fecha: ${fechaActual}`, {
    x: width - 200,
    y: height - 60,
    size: 10,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  // Información del cliente
  let yPosition = height - 150;
  
  page.drawText('INFORMACIÓN DEL CLIENTE', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: primaryColor,
  });
  
  yPosition -= 25;
  
  page.drawText(cliente.nombre, {
    x: 50,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: darkGray,
  });
  
  yPosition -= 20;
  
  page.drawText(cliente.correo, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: darkGray,
  });
  
  // Encabezado de la tabla
  yPosition -= 40;
  
  // Fondo del encabezado de la tabla
  page.drawRectangle({
    x: 50,
    y: yPosition - 5,
    width: width - 100,
    height: 25,
    color: lightGray,
  });
  
  page.drawText('PRODUCTO/SERVICIO', {
    x: 55,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText('CANTIDAD', {
    x: 300,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText('PRECIO UNIT.', {
    x: 370,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText('TOTAL', {
    x: 470,
    y: yPosition,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });
  
  yPosition -= 30;
  
  // Items de la proforma
  items.forEach((item, index) => {
    // Fondo alternado para mejor legibilidad
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: yPosition - 15,
        width: width - 100,
        height: 20,
        color: rgb(0.98, 0.98, 0.98),
      });
    }
    
    page.drawText(item.productoNombre, {
      x: 55,
      y: yPosition,
      size: 10,
      font: font,
      color: darkGray,
    });
    
    page.drawText(item.cantidad.toString(), {
      x: 300,
      y: yPosition,
      size: 10,
      font: font,
      color: darkGray,
    });
    
    page.drawText(`Bs. ${item.precioUnitario.toFixed(2)}`, {
      x: 370,
      y: yPosition,
      size: 10,
      font: font,
      color: darkGray,
    });
    
    page.drawText(`Bs. ${item.total.toFixed(2)}`, {
      x: 470,
      y: yPosition,
      size: 10,
      font: font,
      color: darkGray,
    });
    
    yPosition -= 20;
  });
  
  // Línea separadora
  yPosition -= 20;
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: darkGray,
  });
  
  yPosition -= 30;
  
  // Total
  page.drawText('TOTAL:', {
    x: 370,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: primaryColor,
  });
  
  page.drawText(`Bs. ${venta.total.toFixed(2)}`, {
    x: 450,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: accentColor,
  });
  
  // Información de la empresa en el pie
  yPosition = 80;
  
  page.drawLine({
    start: { x: 50, y: yPosition + 20 },
    end: { x: width - 50, y: yPosition + 20 },
    thickness: 0.5,
    color: lightGray,
  });
  
  page.drawText('Gracias por su confianza', {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: darkGray,
  });
  
  page.drawText('contacto@miempresa.com | +591 123 456 789', {
    x: width - 300,
    y: yPosition,
    size: 9,
    font: font,
    color: darkGray,
  });
  
  return await pdfDoc.save();
}