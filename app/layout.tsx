import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "filedrop", description: "Drop files, share the link, grab them on another desktop." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
