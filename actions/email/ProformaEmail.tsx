// ProformaEmail.tsx
import { Html, Head, Body, Container, Section, Text, Heading, Hr } from '@react-email/components';

interface ProformaEmailProps {
  clienteNombre: string;
  numeroVenta: string;
  pdfUrl: string;
}

export default function ProformaEmail({ clienteNombre, numeroVenta }: ProformaEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Encabezado con diseño moderno */}
          <Section style={header}>
            <Heading style={companyName}>MicroMercado Anita</Heading>
            <Text style={tagline}>Tu tienda de confianza</Text>
          </Section>
          
          {/* Contenido principal */}
          <Section style={content}>
            <Heading style={titleSection}>
              Proforma #{numeroVenta}
            </Heading>
            
            <Text style={greeting}>
              Estimado/a <strong>{clienteNombre}</strong>,
            </Text>
            
            <Text style={paragraph}>
              Le enviamos adjunta la proforma <strong>#{numeroVenta}</strong> que ha solicitado.
            </Text>
            
            <Text style={paragraph}>
              En el documento PDF adjunto encontrará:
            </Text>
            
            <Section style={infoBox}>
              <Text style={infoItem}>✓ Detalle completo de productos/servicios</Text>
              <Text style={infoItem}>✓ Descuentos aplicados (si corresponde)</Text>
              <Text style={infoItem}>✓ Monto total y cambio</Text>
              <Text style={infoItem}>✓ Información de pago</Text>
            </Section>

            <Text style={paragraph}>
              Agradecemos su preferencia y confianza en nuestros servicios.
            </Text>
            
            <Hr style={divider} />
            
            <Text style={footerNote}>
              Si tiene alguna pregunta o necesita realizar cambios, no dude en contactarnos.
            </Text>

            <Text style={signature}>
              Atentamente,<br />
              <strong>El equipo de MicroMercado Anita</strong>
            </Text>
          </Section>
          
          {/* Pie de página */}
          <Section style={footer}>
            <Text style={footerText}>
              <strong>MicroMercado Anita</strong>
            </Text>
            <Text style={footerText}>
              📧 anita@gmail.com • 📞 +591 123 456 789
            </Text>
            <Text style={footerTextSmall}>
              Este es un correo automático, por favor no responda directamente.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  width: '100%',
  maxWidth: '600px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
};

const header = {
  backgroundColor: '#1e3a8a',
  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  padding: '40px 40px 35px',
  textAlign: 'center' as const,
};

const companyName = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 5px 0',
  padding: '0',
  letterSpacing: '1px',
};

const tagline = {
  color: '#e0e7ff',
  fontSize: '14px',
  fontWeight: '400',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '40px 40px 30px',
};

const titleSection = {
  color: '#1e3a8a',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 25px 0',
  textAlign: 'center' as const,
  borderBottom: '3px solid #3b82f6',
  paddingBottom: '15px',
};

const greeting = {
  fontSize: '18px',
  color: '#18181b',
  marginBottom: '15px',
  lineHeight: '1.5',
};

const paragraph = {
  fontSize: '16px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '15px 0',
};

const infoBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const infoItem = {
  fontSize: '15px',
  color: '#0c4a6e',
  lineHeight: '1.8',
  margin: '8px 0',
  fontWeight: '500',
};

const divider = {
  borderColor: '#e4e4e7',
  margin: '30px 0',
};

const footerNote = {
  fontSize: '14px',
  color: '#71717a',
  lineHeight: '1.5',
  margin: '20px 0',
  fontStyle: 'italic',
};

const signature = {
  fontSize: '16px',
  color: '#18181b',
  lineHeight: '1.6',
  margin: '25px 0 0 0',
};

const footer = {
  backgroundColor: '#fafafa',
  padding: '30px 40px',
  borderTop: '1px solid #e4e4e7',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#52525b',
  textAlign: 'center' as const,
  margin: '5px 0',
};

const footerTextSmall = {
  fontSize: '12px',
  color: '#a1a1aa',
  textAlign: 'center' as const,
  margin: '10px 0 0 0',
  fontStyle: 'italic',
};