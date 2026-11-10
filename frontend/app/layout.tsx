
import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import ThemeLayout from "./ThemeLayout";
import AuthGate from "./AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displaySerif = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const devotionalSerif = Noto_Serif_Devanagari({
  variable: "--font-serif",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sanskrit Sadhana",
  description: "Master the divine sounds with AI-guided precision.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} ${devotionalSerif.variable} antialiased`}>
        <AuthProvider>
          <ThemeLayout>
            <AuthGate>{children}</AuthGate>
          </ThemeLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
