"use client"
import { useEffect, useState } from "react"

interface Stats {
  totalProspects: number
  totalCampaigns: number
  pending: number
  approved: number
  sent: number
  bounced: number
  replied: number
}

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="card">
    <p className="text-sm text-ink-muted mb-1">{label}</p>
    <p className={`text-3xl font-semibold ${color}`}>{value.toLocaleString()}</p>
  </div>
)

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
    </div>
  )

  if (!stats) return null

  const sendRate = stats.sent > 0
    ? Math.round((stats.sent / (stats.sent + stats.bounced)) * 100)
    : 0

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="text-ink-muted mt-1">Vue globale de tes campagnes</p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Prospects" value={stats.totalProspects} color="text-ink-primary" />
        <StatCard label="Campagnes" value={stats.totalCampaigns} color="text-brand-500" />
        <StatCard label="Emails envoyés" value={stats.sent} color="text-success-600" />
        <StatCard label="En attente" value={stats.pending} color="text-warning-600" />
      </div>

      {/* Stats secondaires */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center text-success-600 text-lg">✓</div>
          <div>
            <p className="text-xs text-ink-muted">Approuvés</p>
            <p className="text-xl font-semibold text-ink-primary">{stats.approved}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center text-danger-600 text-lg">↩</div>
          <div>
            <p className="text-xs text-ink-muted">Bounces</p>
            <p className="text-xl font-semibold text-ink-primary">{stats.bounced}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 text-lg">%</div>
          <div>
            <p className="text-xs text-ink-muted">Taux délivrabilité</p>
            <p className="text-xl font-semibold text-ink-primary">{sendRate}%</p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card">
        <h2 className="mb-4">Actions rapides</h2>
        <div className="flex gap-3">
          <a href="/prospects" className="btn-primary">+ Importer des prospects</a>
          <a href="/campaigns" className="btn-secondary">Créer une campagne</a>
          <a href="/validation" className="btn-secondary">Valider les emails ({stats.pending})</a>
        </div>
      </div>
    </div>
  )
}
