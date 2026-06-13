"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const nav = [
  { href: "/dashboard",  label: "Dashboard",   icon: "▦" },
  { href: "/prospects",  label: "Prospects",   icon: "◉" },
  { href: "/campaigns",  label: "Campagnes",   icon: "◈" },
  { href: "/validation", label: "Validation",  icon: "◎" },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 min-h-screen bg-surface-0 border-r border-surface-border flex flex-col">
      <div className="px-5 py-5 border-b border-surface-border">
        <span className="text-base font-semibold text-ink-primary tracking-tight">
          Prospection
        </span>
        <span className="ml-1 text-brand-500 font-semibold">AI</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
                ${active
                  ? "bg-brand-50 text-brand-600"
                  : "text-ink-secondary hover:bg-surface-100 hover:text-ink-primary"
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-surface-border">
        <p className="text-xs text-ink-muted">Sprint 1 · v0.1</p>
      </div>
    </aside>
  )
}
