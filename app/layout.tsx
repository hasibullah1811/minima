import type { Metadata } from "next";
import { Inter } from "next/font/google";

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
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Minima",
    title: "Minima | Machine Learning, Made Visible",
    description:
      "An open-source, interactive educational platform designed to strip away the black box abstraction of Machine Learning through pure geometric intuition.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minima | Machine Learning, Made Visible",
    description:
      "An open-source, interactive educational platform designed to strip away the black box abstraction of Machine Learning through pure geometric intuition.",
    creator: "@hasibullah1811",
  },
  robots: {
    index: true,
    follow: true,
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
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
