/**
 * React Email template for the demographic-update invitation.
 *
 * Single CTA (unlike the consent email's AGREE/DECLINE pair). Wording is
 * participant-facing and avoids program jargon.
 *
 * Render with @react-email/render in the sender:
 *   import { render } from '@react-email/render';
 *   const html = await render(<DemographicInviteEmail ... />);
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

export interface DemographicInviteEmailProps {
    inviteUrl: string;
    senderDisplayName: string;
    /** Used in the greeting + preview snippet */
    recipientFirstName?: string;
}

export function DemographicInviteEmail({
    inviteUrl,
    senderDisplayName,
    recipientFirstName,
}: DemographicInviteEmailProps) {
    const greeting = recipientFirstName ? `Hello ${recipientFirstName},` : 'Hello,';

    return (
        <Html>
            <Head />
            <Preview>Please review and update your information</Preview>
            <Body style={bodyStyle}>
                <Container style={containerStyle}>
                    <Section style={cardStyle}>
                        <Heading as="h2" style={headingStyle}>
                            Please review your information
                        </Heading>
                        <Text style={paragraphStyle}>{greeting}</Text>
                        <Text style={paragraphStyle}>
                            We'd like to make sure the information we have on file for you is
                            current. Please click the button below to review and update your
                            contact details, address, and other information whenever convenient.
                        </Text>

                        <Section style={buttonRowStyle}>
                            <Button href={inviteUrl} style={primaryButtonStyle}>
                                UPDATE MY INFORMATION
                            </Button>
                        </Section>

                        <Text style={separatorStyle}>OR</Text>

                        <Text style={fallbackLabelStyle}>Open this link in your browser</Text>
                        <Link href={inviteUrl} style={fallbackLinkStyle}>
                            {inviteUrl}
                        </Link>
                    </Section>

                    <Text style={footerStyle}>
                        Sent by {senderDisplayName}. If you did not expect this message, you
                        can safely ignore it. The link will expire in 30 days.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

export default DemographicInviteEmail;

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

const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#1a73a8',
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
