import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
