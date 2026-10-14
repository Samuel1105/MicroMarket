// ProformaEmail.tsx
import { Html, Head, Preview, Body, Container, Section, Row, Column, Text, Heading, Hr } from '@react-email/components';

interface ProformaEmailProps {
  clienteNombre: string;
  numeroVenta: string;
  /** Fecha y hora de la venta, ya formateada (Bolivia) */
  fecha?: string;
  total?: number;
  cantidadProductos?: number;
  contacto?: string;
  telefono?: string;
}

export default function ProformaEmail({ clienteNombre, numeroVenta, fecha, total, cantidadProductos, contacto, telefono }: ProformaEmailProps) {
  const primerNombre = (clienteNombre || '').trim().split(/\s+/)[0] || 'cliente';

  return (
    <Html lang="es">
      <Head />
      <Preview>{`Adjuntamos su proforma ${numeroVenta}. Gracias por comprar en MicroMercado Anita.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={topBar}>
            <Text style={brand}>MicroMercado Anita</Text>
            <Text style={tagline}>Tu tienda de confianza · Cochabamba, Bolivia</Text>
          </Section>

          <Section style={content}>
            <Heading as="h1" style={title}>
              Gracias por su compra, {primerNombre}
            </Heading>

            <Text style={paragraph}>
              Adjuntamos en PDF la proforma de su compra. Puede guardarla o imprimirla como comprobante.
            </Text>

            <Section style={summary}>
              <Row style={summaryRow}>
                <Column style={summaryLabel}>Proforma:</Column>
                <Column style={summaryValue}>N.º {numeroVenta}</Column>
              </Row>
              {fecha && (
                <Row style={summaryRow}>
                  <Column style={summaryLabel}>Fecha:</Column>
                  <Column style={summaryValue}>{fecha}</Column>
                </Row>
              )}
              {typeof cantidadProductos === 'number' && (
                <Row style={summaryRow}>
                  <Column style={summaryLabel}>Productos:</Column>
                  <Column style={summaryValue}>{cantidadProductos}</Column>
                </Row>
              )}
              {typeof total === 'number' && (
                <Row style={summaryRowTotal}>
                  <Column style={summaryLabelTotal}>Total pagado:</Column>
                  <Column style={summaryValueTotal}>Bs {total.toFixed(2)}</Column>
                </Row>
              )}
            </Section>

            <Text style={paragraph}>
              El archivo adjunto detalla cada producto, los descuentos aplicados, el monto recibido y el cambio.
            </Text>

            <Hr style={divider} />

            <Text style={small}>
              ¿Alguna duda sobre su compra? Responda a este correo o comuníquese con nosotros
              {telefono ? ` al ${telefono}` : ''}.
            </Text>
            <Text style={signature}>
              Atentamente,
              <br />
              <strong>Equipo MicroMercado Anita</strong>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>MicroMercado Anita · Cochabamba, Bolivia{contacto ? ` · ${contacto}` : ''}</Text>
            <Text style={footerSmall}>Este mensaje se generó automáticamente al registrar su compra. La proforma es un comprobante informativo y no constituye factura.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f3f5f7',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  width: '100%',
  maxWidth: '560px',
  border: '1px solid #e1e6ea',
};

const topBar = {
  backgroundColor: '#0b3a55',
  borderBottom: '4px solid #f26a10',
  padding: '26px 32px 22px',
  textAlign: 'left' as const,
};

const brand = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1.2',
};

const tagline = {
  color: '#c7d8e4',
  fontSize: '12px',
  margin: '4px 0 0',
};

const content = {
  padding: '30px 32px 12px',
};

const title = {
  color: '#0b3a55',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 14px',
  lineHeight: '1.3',
};

const paragraph = {
  color: '#3b4652',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const summary = {
  backgroundColor: '#f6f8fa',
  border: '1px solid #e1e6ea',
  padding: '6px 18px',
  margin: '4px 0 20px',
};

const summaryRow = {
  borderBottom: '1px solid #e8ecef',
};

const summaryLabel = {
  color: '#6b7683',
  fontSize: '13px',
  padding: '9px 0',
  width: '45%',
};

const summaryValue = {
  color: '#1f2933',
  fontSize: '14px',
  fontWeight: '600',
  padding: '9px 0',
  textAlign: 'right' as const,
};

const summaryRowTotal = {};

const summaryLabelTotal = {
  color: '#0b3a55',
  fontSize: '14px',
  fontWeight: '700',
  padding: '12px 0 10px',
  width: '45%',
};

const summaryValueTotal = {
  color: '#0b3a55',
  fontSize: '18px',
  fontWeight: '700',
  padding: '12px 0 10px',
  textAlign: 'right' as const,
};

const divider = {
  borderColor: '#e1e6ea',
  margin: '8px 0 18px',
};

const small = {
  color: '#6b7683',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 14px',
};

const signature = {
  color: '#1f2933',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 18px',
};

const footer = {
  backgroundColor: '#f6f8fa',
  borderTop: '1px solid #e1e6ea',
  padding: '18px 32px',
};

const footerText = {
  color: '#52606d',
  fontSize: '12px',
  margin: '0 0 6px',
};

const footerSmall = {
  color: '#8a95a1',
  fontSize: '11px',
  lineHeight: '1.5',
  margin: '0',
};
