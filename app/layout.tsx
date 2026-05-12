import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Minima — ML lessons",
    template: "%s — Minima",
  },
  description:
    "An open, typography-first learning surface for core machine learning ideas.",
};

/**
 * Root layout establishes global font variables and **dark-by-default** chrome.
 * Lesson routes inherit this shell; nested layouts can extend later (nav, footer).
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
