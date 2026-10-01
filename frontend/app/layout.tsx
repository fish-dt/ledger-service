import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reconciliation · Ledger",
  description: "Processor payouts matched against the internal ledger",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
