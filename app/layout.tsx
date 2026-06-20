import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HARMONIE · Harmonisches Frequenzsystem",
  description:
    "Echtzeit-Controller für ein harmonisches Frequenzsystem mit Korg nanoKONTROL2, Web MIDI API und Web Audio API.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
