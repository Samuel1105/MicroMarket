// ProformaEmail.tsx
import { Html, Head, Body, Container, Section, Text, Link, Heading } from '@react-email/components';

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
          <Section style={header}>
            <Heading style={companyName}>MI EMPRESA</Heading>
            <Text style={companyTagline}>Soluciones Profesionales</Text>
          </Section>
          
          <Section style={content}>
            <Text style={greeting}>Estimado/a {clienteNombre},</Text>
            
            <Text style={paragraph}>
              Adjuntamos la proforma <strong>#{numeroVenta}</strong> solicitada.
            </Text>
            
            <Text style={paragraph}>
              Agradecemos su preferencia y quedamos a su disposición para cualquier consulta.
            </Text>

            <Text style={paragraph}>
              Atentamente,
            </Text>
            
            <Text style={signature}>
              El equipo de MI EMPRESA
            </Text>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              MI EMPRESA • contacto@miempresa.com • +591 123 456 789
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  border: '1px solid #e6ebf1',
  borderRadius: '8px',
  overflow: 'hidden' as const,
  width: '100%',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#1a3a6c',
  padding: '30px 40px',
  textAlign: 'center' as const,
};

const companyName = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const companyTagline = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '5px 0 0 0',
  opacity: 0.8,
};

const content = {
  padding: '40px',
};

const greeting = {
  fontSize: '18px',
  color: '#333333',
  marginBottom: '20px',
  lineHeight: '1.4',
};

const paragraph = {
  fontSize: '16px',
  color: '#555555',
  lineHeight: '1.5',
  margin: '15px 0',
};

const signature = {
  fontSize: '16px',
  color: '#333333',
  fontWeight: 'bold',
  margin: '20px 0 0 0',
};

const footer = {
  backgroundColor: '#f8f9fa',
  padding: '20px 40px',
  borderTop: '1px solid #e6ebf1',
};

const footerText = {
  fontSize: '12px',
  color: '#666666',
  textAlign: 'center' as const,
  margin: '0',
};