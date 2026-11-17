import type { Metadata } from "next";
import { Geist, Geist_Mono, UnifrakturCook } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const blackletter = UnifrakturCook({
  variable: "--font-blackletter",
  weight: "700",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DWS Maker – Declaration of Work Schedule",
  description: "Plan a faculty weekly schedule and download the Declaration of Work Schedule and Teaching Assignment forms.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${blackletter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-gray-900">{children}</body>
    </html>
  );
}
