import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryToast } from "@/components/query-toast";

export const metadata: Metadata = {
  title: "Paperwork OS",
  description: "Vault + Packs for structured application workflows"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryToast />
        <Toaster position="top-right" richColors />
        {children}
      </body>
    </html>
  );
}
