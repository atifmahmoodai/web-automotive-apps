import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carbook — Good cars. Better company.",
  description: "An automotive community for the people, cars and stories behind every great drive.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
