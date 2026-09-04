import type {Metadata} from 'next';
import Script from 'next/script';
import {EB_Garamond, Inter} from 'next/font/google';
import './globals.css'; // Global styles

/**
 * The two faces the Typography selector offers (see LeftSidebar).
 *
 * These must actually be loaded: globals.css used to define
 * `--font-serif: var(--font-serif)`, which is self-referential and resolves
 * to nothing, so the selector changed no pixels. next/font self-hosts the
 * files into the build, so the page does not depend on the viewer having
 * either font installed — which matters because the PDF is typeset in
 * EB Garamond and the two should agree.
 *
 * The variables are named after the faces rather than --font-serif /
 * --font-sans because Tailwind's @theme block defines those two at :root;
 * globals.css maps these onto them, which keeps the indirection acyclic.
 */
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-eb-garamond',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Divine Office Booklet Builder',
  description: 'Modular layout editor for the sung Divine Office.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${inter.variable}`}>
      <head />
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Script src="/exsurge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
