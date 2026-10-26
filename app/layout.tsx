import type { Metadata } from "next";
import "./globals.css";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";

export const metadata: Metadata = {
  title: "PCSN Financial Assistance",
  description: "HIPAA-conscious financial assistance intake portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><EnvironmentBanner />{children}</body>
    </html>
  );
}
