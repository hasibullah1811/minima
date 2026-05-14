import type { Metadata } from "next";
import { Inter } from "next/font/google";

import Footer from "@/components/Footer";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Minima | Machine Learning, Made Visible",
    template: "%s | Minima",
  },
  description:
    "An open-source, interactive educational platform designed to strip away the black box abstraction of Machine Learning through pure geometric intuition.",
  keywords: [
    "Machine Learning",
    "Interactive Visualizations",
    "AI Education",
    "Next.js",
    "K-Means",
    "KNN",
  ],
  authors: [{ name: "Hasibullah", url: "https://github.com/hasibullah1811" }],
  creator: "Hasibullah",
  openGraph: {
    title: 'Minima | Machine Learning, Made Visible',
    description: 'An open-source, interactive exploration of ML algorithms.',
    url: 'https://tryminima.com', 
    siteName: 'Minima',
    images: [
      {
        url: '/opengraph-image.png', 
        width: 1200,
        height: 630,
        alt: 'Minima | Machine Learning, Made Visible',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Minima | Machine Learning, Made Visible',
    description: 'An open-source, interactive exploration of ML algorithms.',
    images: ['/opengraph-image.png'],
  },
};

/**
 * Root layout establishes global font variables, **dark-by-default** chrome,
 * and sitewide SEO via the Metadata API (Open Graph, Twitter, keywords).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans flex min-h-dvh flex-col antialiased`}
      >
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
