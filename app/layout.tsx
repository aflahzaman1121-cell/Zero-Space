import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "zero space | The Zero School", description: "Practice, timed tests and progress tracking for The Zero School students." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2B3CFF" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
