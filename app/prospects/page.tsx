"use client"
import { useEffect, useRef, useState } from "react"

interface Prospect {
  id: string
  firstName: string
  lastName: string
  company: string
  position: string
  email1: string
  email2: string
  email3: string
  emailValid: string
  industry: string
  companySize: string
  createdAt: string
}

export default function ProspectsPage() {
  const [prospects, setProspects]     = useState<Prospect[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [importing, setImporting]     = useState(false)
  const [enriching, setEnriching]     = useState(false)
  const [salesNavUrl, setSalesNavUrl] = useState("")
  const [salesNavLimit, setSalesNavLimit] = useState(100)
  const [showSalesNav, setShowSalesNav]   = useState(false)
  const [importResult, setImportResult]   = useState<{ imported: number; skipped: number; source?: string } | null>(null)
  const [search, setSearch]           = useState("")
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const load = (q = "") => {
    setLoading(true)
    fetch(`/api/prospects?search=${q}&limit=100`)
      .then(r => r.json())
      .then(d => { setProspects(d.prospects); setTotal(d.total); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/prospects/import", { method: "POST", body: fd })
    const data = await res.json()
    setImportResult({ imported: data.imported, skipped: data.skipped, source: "CSV" })
    setImporting(false)
    load(search)
  }

  const handleSalesNavImport = async () => {
    if (!salesNavUrl) return alert("Colle une URL Sales Navigator")
    setImporting(true)
    setImportResult(null)
    const res = await fetch("/api/prospects/salesnav", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesNavUrl, limit: salesNavLimit }),
    })
    const data = await res.json()
    if (data.error) {
      alert("Erreur : " + data.error)
    } else {
      setImportResult({ imported: data.imported, skipped: data.skipped, source: "Sales Navigator" })
    }
    setImporting(false)
    setShowSalesNav(false)
    setSalesNavUrl("")
    load(search)
  }

  const handleEnrich = async () => {
    const ids = selected.size > 0 ? [...selected] : undefined
    setEnriching(true)
    const res = await fetch("/api/prospects/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: ids }),
    })
    const data = await res.json()
    setEnriching(false)
    alert(`✓ ${data.enriched} emails trouvés · ${data.notFound} non trouvés · ${data.errors} erreurs`)
    load(search)
  }

  const handleDelete = async () => {
    if (!selected.size) return
    if (!confirm(`Supprimer ${selected.size} prospect(s) ?`)) return
    await fetch("/api/prospects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    })
    setSelected(new Set())
    load(search)
  }

  const toggleSelect = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const toggleAll = () => {
    setSelected(selected.size === prospects.length ? new Set() : new Set(prospects.map(p => p.id)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Prospects</h1>
          <p className="text-ink-muted mt-1">{total.toLocaleString()} contacts importés</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          {selected.size > 0 && (
            <>
              <button onClick={handleEnrich} disabled={enriching} className="btn-secondary">
                {enriching ? "Enrichissement…" : `✦ Enrichir via Prospeo (${selected.size})`}
              </button>
              <button onClick={handleDelete} className="btn-danger">
                Supprimer ({selected.size})
              </button>
            </>
          )}
          {selected.size === 0 && (
            <button onClick={handleEnrich} disabled={enriching} className="btn-secondary">
              {enriching ? "Enrichissement…" : "✦ Enrichir tous via Prospeo"}
            </button>
          )}
          <button onClick={() => setShowSalesNav(!showSalesNav)} className="btn-secondary">
            ⬡ Importer Sales Navigator
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-primary" disabled={importing}>
            {importing ? "Import…" : "+ Importer CSV"}
          </button>
        </div>
      </div>

      {/* Import Sales Navigator */}
      {showSalesNav && (
        <div className="card space-y-4">
          <h2>Importer depuis Sales Navigator</h2>
          <p className="text-sm text-ink-muted">
            Colle l'URL de ta recherche Sales Navigator. Prospeo va extraire et enrichir les prospects automatiquement.
          </p>
          <div>
            <label className="label">URL Sales Navigator</label>
            <textarea
              className="input h-24 resize-none font-mono text-xs"
              placeholder="https://www.linkedin.com/sales/search/people?query=..."
              value={salesNavUrl}
              onChange={e => setSalesNavUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="label">Nombre de prospects à extraire</label>
              <input
                type="number" min="10" max="100" step="10"
                className="input w-32"
                value={salesNavLimit}
                onChange={e => setSalesNavLimit(parseInt(e.target.value) || 100)}
              />
              <p className="text-xs text-ink-muted mt-1">Max 100 par import (limite Prospeo)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSalesNavImport} disabled={importing || !salesNavUrl} className="btn-primary">
              {importing ? "Import en cours…" : "Lancer l'import"}
            </button>
            <button onClick={() => setShowSalesNav(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Résultat import */}
      {importResult && (
        <div className="card bg-success-50 border-success-600">
          <p className="text-success-600 font-medium">
            ✓ {importResult.imported} prospects importés depuis {importResult.source}
            {importResult.skipped > 0 && ` · ${importResult.skipped} ignorés`}
          </p>
        </div>
      )}

      {/* Format CSV */}
      <div className="card bg-surface-50">
        <h3 className="mb-2">Format CSV attendu</h3>
        <p className="text-xs text-ink-muted font-mono">
          firstName, lastName, company, domain, position, industry, companySize, location, linkedinUrl
        </p>
        <p className="text-xs text-ink-muted mt-1">Compatible Evaboot, Apollo.io et Sales Navigator.</p>
      </div>

      {/* Recherche */}
      <input
        type="text"
        placeholder="Rechercher par nom, entreprise, poste…"
        className="input max-w-md"
        value={search}
        onChange={e => { setSearch(e.target.value); load(e.target.value) }}
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : prospects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ink-muted">Aucun prospect. Importe un CSV ou une recherche Sales Navigator.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-border">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.size === prospects.length} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Entreprise</th>
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Poste</th>
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Email</th>
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p, i) => (
                <tr key={p.id} className={`border-b border-surface-border hover:bg-surface-50 ${i % 2 === 0 ? "" : "bg-surface-50/50"}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-primary">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{p.company}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.position}</td>
                  <td className="px-4 py-3 text-ink-muted font-mono text-xs">
                    {p.emailValid
                      ? <span className="text-success-600">{p.emailValid}</span>
                      : p.email1 || <span className="text-ink-muted italic">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {p.emailValid
                      ? <span className="badge-success">Vérifié</span>
                      : p.email1
                        ? <span className="badge-warning">Non vérifié</span>
                        : <span className="badge-neutral">Sans email</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
