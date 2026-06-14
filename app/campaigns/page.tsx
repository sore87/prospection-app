"use client"
import { useEffect, useState } from "react"

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  sequences: { id: string; stepNumber: number; delayDays: number }[]
  _count: { campaignProspects: number }
  createdAt: string
}

const statusBadge: Record<string, string> = {
  draft:     "badge-neutral",
  active:    "badge-success",
  paused:    "badge-warning",
  completed: "badge-neutral",
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [autoApprove, setAutoApprove] = useState(false)

  const [form, setForm] = useState({
    name: "", description: "",
    product: "", targetDescription: "", valueProposition: "",
    senderName: "", senderPosition: "", senderCompany: "",
    steps: [
      { delayDays: 0 },
      { delayDays: 4 },
      { delayDays: 4 },
      { delayDays: 4 },
    ],
  })

  const load = () => {
    setLoading(true)
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.product) return alert("Nom et produit obligatoires")
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sequences: form.steps }),
    })
    if (res.ok) { setShowForm(false); load() }
  }

const handleGenerate = async (campaignId: string) => {
  setGenerating(campaignId)
  
  // Récupère les prospects de la campagne
  const res = await fetch(`/api/campaigns`)
  const { campaigns } = await res.json()
  const campaign = campaigns.find((c: Campaign) => c.id === campaignId)
  const total = campaign?._count?.campaignProspects || 0
  
  let generated = 0
  // Génère un email à la fois pour éviter le timeout
  for (let i = 0; i < total; i++) {
    const r = await fetch("/api/emails/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, autoApprove, limit: 1 }),
    })
    const data = await r.json()
    generated += data.generated
    if (data.generated === 0 && data.errors === 0) break
  }
  
  setGenerating(null)
  alert(`✓ ${generated} emails générés`)
}

  const handleEnroll = async (campaignId: string) => {
    const res = await fetch("/api/prospects?limit=1000")
    const { prospects } = await res.json()
    if (!prospects.length) return alert("Aucun prospect importé")
    const ids = prospects.map((p: { id: string }) => p.id)
    await fetch(`/api/campaigns/${campaignId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: ids }),
    })
    load()
    alert(`✓ ${ids.length} prospects enrôlés`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Campagnes</h1>
          <p className="text-ink-muted mt-1">{campaigns.length} campagne(s)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Annuler" : "+ Nouvelle campagne"}
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="card space-y-6">
          <h2>Nouvelle campagne</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom de la campagne *</label>
              <input className="input" placeholder="ex: TSplus IT Providers France Mai 2026"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" placeholder="Notes internes"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-surface-border pt-4">
            <h3 className="mb-3">Contexte produit</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="label">Produit / Solution *</label>
                <input className="input" placeholder="ex: TSplus Remote Access"
                  value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} />
              </div>
              <div>
                <label className="label">Cible (qui tu prospectes)</label>
                <input className="input" placeholder="ex: revendeurs et prestataires IT accompagnant des TPE/PME sur Windows Server"
                  value={form.targetDescription} onChange={e => setForm({ ...form, targetDescription: e.target.value })} />
              </div>
              <div>
                <label className="label">Proposition de valeur</label>
                <textarea className="input h-20 resize-none" placeholder="ex: publier des applications Windows depuis un serveur existant, accès web sécurisé avec MFA, déploiement rapide sans projet lourd"
                  value={form.valueProposition} onChange={e => setForm({ ...form, valueProposition: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t border-surface-border pt-4">
            <h3 className="mb-3">Expéditeur</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Prénom Nom</label>
                <input className="input" placeholder="Jean Dupont"
                  value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} />
              </div>
              <div>
                <label className="label">Poste</label>
                <input className="input" placeholder="Business Developer"
                  value={form.senderPosition} onChange={e => setForm({ ...form, senderPosition: e.target.value })} />
              </div>
              <div>
                <label className="label">Entreprise</label>
                <input className="input" placeholder="TSplus"
                  value={form.senderCompany} onChange={e => setForm({ ...form, senderCompany: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t border-surface-border pt-4">
            <h3 className="mb-3">Séquence ({form.steps.length} étapes)</h3>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-ink-muted">Email {i + 1}</span>
                  <span className="text-ink-muted">délai :</span>
                  <input
                    type="number" min="0" className="input w-20"
                    value={step.delayDays}
                    onChange={e => {
                      const steps = [...form.steps]
                      steps[i] = { delayDays: parseInt(e.target.value) || 0 }
                      setForm({ ...form, steps })
                    }}
                  />
                  <span className="text-ink-muted">jours après l'étape précédente</span>
                  {form.steps.length > 1 && (
                    <button onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}
                      className="text-danger-600 hover:text-danger-600 ml-auto">✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm({ ...form, steps: [...form.steps, { delayDays: 4 }] })}
                className="btn-secondary text-xs mt-2">+ Ajouter une étape</button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} className="btn-primary">Créer la campagne</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Liste campagnes */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ink-muted">Aucune campagne. Crée ta première séquence.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Option auto-approve */}
          <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
            <input type="checkbox" checked={autoApprove} onChange={e => setAutoApprove(e.target.checked)} />
            Mode automatique — approuver et envoyer sans validation manuelle
          </label>

          {campaigns.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base">{c.name}</h2>
                    <span className={statusBadge[c.status] || "badge-neutral"}>{c.status}</span>
                  </div>
                  {c.description && <p className="text-sm text-ink-muted">{c.description}</p>}
                  <p className="text-xs text-ink-muted mt-2">
                    {c.sequences.length} étapes ·{" "}
                    {c._count.campaignProspects} prospects enrôlés ·{" "}
                    Créée le {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <button onClick={() => handleEnroll(c.id)} className="btn-secondary text-xs">
                    + Enrôler prospects
                  </button>
                  <button
                    onClick={() => handleGenerate(c.id)}
                    disabled={generating === c.id}
                    className="btn-primary text-xs"
                  >
                    {generating === c.id ? "Génération…" : "Générer emails"}
                  </button>
                </div>
              </div>

              {/* Étapes */}
              <div className="flex gap-2 mt-4">
                {c.sequences.map(s => (
                  <div key={s.id} className="flex-1 bg-surface-50 rounded px-3 py-2 text-center">
                    <p className="text-xs font-medium text-ink-primary">Email {s.stepNumber}</p>
                    <p className="text-xs text-ink-muted">J+{s.delayDays}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
