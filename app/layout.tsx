import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Divine Office Booklet Builder',
  description: 'Modular layout editor for the sung Divine Office.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Script src="/exsurge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
