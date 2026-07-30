import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PCSN Financial Assistance Portal Demo",
  description:
    "CEO review demo for the Phoenix Cancer Support Network intake and volunteer review portal.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
