import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Policy Assistant | Nordlight Insurance",
  description: "A governed assistant for synthetic home insurance policy information.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/">Nordlight Insurance</a>
          <a href="/admin">Admin</a>
        </header>
        {children}
      </body>
    </html>
  );
}
