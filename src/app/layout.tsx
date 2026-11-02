import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrivateHSP — Private payment infrastructure for autonomous commerce",
  description: "Discover suppliers, enforce payment policy, and verify private-recipient transactions with PrivateHSP.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
