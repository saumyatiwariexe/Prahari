import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prahari — Autonomous Station Safety",
  description: "Predict crowd crush formation 90 seconds before it becomes lethal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-[#0D1117]">{children}</body>
    </html>
  );
}
