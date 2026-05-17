/**
 * React Email template for the communication consent request.
 *
 * Layout intentionally mirrors the original DDOR/Brevo email so already-
 * onboarded participants and providers see something familiar.
 *
 * Render with @react-email/render in the sender:
 *   import { render } from '@react-email/render';
 *   const html = render(<ConsentRequestEmail ... />);
 */

import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface ConsentRequestEmailProps {
  consentText: string;
  yesUrl: string;
  noUrl: string;
  senderDisplayName: string;
  /** Used in the preview text (the mobile inbox snippet) */
  recipientFirstName?: string;
}

export function ConsentRequestEmail({
  consentText,
  yesUrl,
  noUrl,
  senderDisplayName,
  recipientFirstName,
}: ConsentRequestEmailProps) {
  const greeting = recipientFirstName
    ? `Hello ${recipientFirstName},`
    : 'Hello,';

  return (
    <Html>
      <Head />
      <Preview>Permission request from {senderDisplayName}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading as="h2" style={headingStyle}>
              Permission request
            </Heading>
            <Text style={paragraphStyle}>{greeting}</Text>
            <Text style={paragraphStyle}>{consentText}</Text>

            <Section style={buttonRowStyle}>
              <Button href={yesUrl} style={agreeButtonStyle}>
                AGREE
              </Button>
              <Button href={noUrl} style={declineButtonStyle}>
                DECLINE
              </Button>
            </Section>

            <Text style={separatorStyle}>OR</Text>

            <Text style={fallbackLabelStyle}>AGREE by clicking this link</Text>
            <Link href={yesUrl} style={fallbackLinkStyle}>
              {yesUrl}
            </Link>

            <Text style={fallbackLabelStyle}>DECLINE by clicking this link</Text>
            <Link href={noUrl} style={fallbackLinkStyle}>
              {noUrl}
            </Link>
          </Section>

          <Text style={footerStyle}>
            Sent by {senderDisplayName}. If you did not expect this message,
            you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ConsentRequestEmail;

// ---- styles -----------------------------------------------------------------
// Inline styles only — most email clients ignore <style> blocks.

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#e6f1f6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 16px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 28px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const headingStyle: React.CSSProperties = {
  color: '#0f3a5c',
  fontSize: '20px',
  fontWeight: 700,
  margin: '0 0 16px 0',
};

const paragraphStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 16px 0',
};

const buttonRowStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0 8px 0',
};

const agreeButtonStyle: React.CSSProperties = {
  backgroundColor: '#2aa3a3',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '14px',
  letterSpacing: '0.5px',
  padding: '12px 28px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
  marginRight: '12px',
};

const declineButtonStyle: React.CSSProperties = {
  backgroundColor: '#2aa3a3',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '14px',
  letterSpacing: '0.5px',
  padding: '12px 28px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
};

const separatorStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  color: '#6b7280',
  fontSize: '13px',
  margin: '20px 0 12px 0',
};

const fallbackLabelStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  color: '#374151',
  fontSize: '13px',
  margin: '12px 0 4px 0',
};

const fallbackLinkStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center' as const,
  color: '#1f6feb',
  fontSize: '12px',
  wordBreak: 'break-all',
  margin: '0 0 8px 0',
};

const footerStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '20px',
  lineHeight: '18px',
};
