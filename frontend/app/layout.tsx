import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { DemoModeBanner } from "@/components/ui/EmptyState";
import { isDemoMode } from "@/lib/api";

export const metadata: Metadata = {
  title: "Reconciliation · Ledger",
  description: "A product tour of a double-entry ledger's guarantees",
};

// Server Component: the shell (sidebar, scroll container) never needs
// client JS. Only the pieces that actually use hooks (Sidebar's active-link
// state, every page's data fetching) are client components.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex h-screen bg-base">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              {isDemoMode() && <DemoModeBanner />}
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
