import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Prospection App",
  description: "Séquences email automatisées avec IA",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
