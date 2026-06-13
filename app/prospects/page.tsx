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
  industry: string
  companySize: string
  createdAt: string
}

export default function ProspectsPage() {
  const [prospects, setProspects]   = useState<Prospect[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [importing, setImporting]   = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [search, setSearch]         = useState("")
  const [selected, setSelected]     = useState<Set<string>>(new Set())
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
    setImportResult({ imported: data.imported, skipped: data.skipped })
    setImporting(false)
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
        <div className="flex gap-3">
          {selected.size > 0 && (
            <button onClick={handleDelete} className="btn-danger">
              Supprimer ({selected.size})
            </button>
          )}
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-primary" disabled={importing}>
            {importing ? "Import en cours…" : "+ Importer CSV"}
          </button>
        </div>
      </div>

      {/* Résultat import */}
      {importResult && (
        <div className="card bg-success-50 border-success-600">
          <p className="text-success-600 font-medium">
            ✓ {importResult.imported} prospects importés
            {importResult.skipped > 0 && ` · ${importResult.skipped} ignorés (données manquantes)`}
          </p>
        </div>
      )}

      {/* Format CSV attendu */}
      <div className="card bg-surface-50">
        <h3 className="mb-2">Format CSV attendu</h3>
        <p className="text-xs text-ink-muted font-mono">
          firstName, lastName, company, domain, position, industry, companySize, location, linkedinUrl
        </p>
        <p className="text-xs text-ink-muted mt-1">
          Compatible Evaboot, Apollo.io et Sales Navigator. Les colonnes manquantes sont ignorées.
        </p>
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
          <p className="text-ink-muted">Aucun prospect. Importe un fichier CSV pour commencer.</p>
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
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Email #1</th>
                <th className="px-4 py-3 text-left text-ink-muted font-medium">Secteur</th>
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
                  <td className="px-4 py-3 text-ink-muted font-mono text-xs">{p.email1}</td>
                  <td className="px-4 py-3">
                    {p.industry && <span className="badge-neutral">{p.industry}</span>}
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
