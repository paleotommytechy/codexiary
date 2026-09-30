import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codexiary — Turn your work into stories",
  description:
    "A personal developer journal and content operating system for capturing work, learning, and ideas — then turning them into authentic posts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
