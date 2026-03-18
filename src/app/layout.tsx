import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MasteryInit from "@/components/MasteryInit";
import ApiActivityIndicator from "@/components/ApiActivityIndicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeetMentor | AI LeetCode Tracker",
  description: "Track your LeetCode sessions and get personalized AI mentorship with Google Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex bg-background text-foreground min-h-screen pb-16 md:pb-0`}
      >
        <MasteryInit />
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <MobileNav />
        <ApiActivityIndicator />
      </body>
    </html>
  );
}
