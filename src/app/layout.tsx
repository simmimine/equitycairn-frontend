import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TAGLINE = "Know what matters across your watchlist.";
const DESCRIPTION =
  "Follow companies and see relevant coverage grouped in one focused feed. Join the EquityCairn beta.";

export const metadata: Metadata = {
  title: `EquityCairn: ${TAGLINE}`,
  description: DESCRIPTION,
  openGraph: {
    title: TAGLINE,
    description: DESCRIPTION,
    siteName: "EquityCairn",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
