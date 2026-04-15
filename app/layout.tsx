import type { Metadata } from 'next';
import SessionProvider from '@/components/SessionProvider';
import DoriChat from '@/components/DoriChat';
import './globals.css';

export const metadata: Metadata = {
    title: 'DDOR - Data Driven Outcomes Reporting',
    description: 'Behavioral Health Conditional Dismissal Program — Data Collection & Reporting Platform',
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: '48x48' },
        ],
        apple: '/apple-touch-icon.png',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body>
                <SessionProvider>
                    {children}
                    <DoriChat />
                </SessionProvider>
            </body>
        </html>
    );
}
