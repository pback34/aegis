import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/react-query-provider";

export const metadata: Metadata = {
  title: "Aegis - On-Demand Security Guards",
  description: "Connect with professional security guards instantly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
