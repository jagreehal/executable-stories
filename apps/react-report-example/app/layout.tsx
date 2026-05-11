import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Story Report — executable-stories-react example",
  description: "Living documentation backed by executable-stories tests, rendered with executable-stories-react.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
