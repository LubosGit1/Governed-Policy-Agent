import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Policy Assistant | Nordlight Insurance",
  description: "A governed assistant for synthetic home insurance policy information.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
