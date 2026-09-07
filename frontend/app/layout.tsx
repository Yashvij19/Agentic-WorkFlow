import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AetherFlow - Autonomous Agentic Workflow Engine",
  description: "Enterprise-grade autonomous AI workflow engine with DAG orchestration, self-healing guardrails, and hybrid vector RAG.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

import { ToastProvider } from "@/context/ToastContext";
import SessionGuard from "@/components/auth/SessionGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionGuard />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
