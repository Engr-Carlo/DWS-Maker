import type { Metadata } from "next";
import { Geist, Geist_Mono, UnifrakturCook } from "next/font/google";
import "./globals.css";

const deploymentUrl = process.env.APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  || "http://localhost:3000";

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
  metadataBase: new URL(deploymentUrl),
  title: "DWS Maker – Declaration of Work Schedule",
  description: "A faculty workspace for planning weekly schedules and generating the official DWS and teaching assignment letters.",
  applicationName: "DWS Maker",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "DWS Maker",
    title: "DWS Maker – Faculty Schedule Workspace",
    description: "Plan teaching loads, preview official forms, and download ready-to-submit DWS documents.",
    images: [
      {
        url: "/social-preview.jpg",
        width: 1200,
        height: 630,
        alt: "DWS Maker with the Pamantasan ng Cabuyao main building",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DWS Maker – Faculty Schedule Workspace",
    description: "Plan teaching loads, preview official forms, and download ready-to-submit DWS documents.",
    images: ["/social-preview.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${blackletter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-gray-900">
        {children}
        <p className="pointer-events-none fixed bottom-2 right-3 z-[70] text-[10px] font-medium tracking-wide text-gray-500/30 print:hidden">
          Developed by Engr. Carlo
        </p>
      </body>
    </html>
  );
}
