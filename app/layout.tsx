import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import BuildInfoGlobal from "@/components/build-info-global";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PULSE - Cost Management",
  description: "MVP Cost Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const env = process.env.VERCEL_ENV || 'local'
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {/* Build info - visible everywhere, even without AppShell */}
          <BuildInfoGlobal commitSha={commitSha} env={env} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
