"use client"
import { useState } from "react"

// Valeurs basées sur l'API Prospeo
const INDUSTRIES = [
  "IT Services and IT Consulting",
  "Software Development",
  "Technology, Information and Internet",
  "Computer and Network Security",
  "Computer Hardware",
  "Telecommunications",
  "Data Infrastructure and Analytics",
  "Business Consulting and Services",
  "Financial Services",
  "Banking",
  "Insurance",
  "Accounting",
  "Hospitals and Health Care",
  "Medical Equipment Manufacturing",
  "Pharmaceutical Manufacturing",
  "Construction",
  "Real Estate",
  "General Retail",
  "General Wholesale",
  "General Manufacturing",
  "Automotive",
  "Transportation, Logistics, Supply Chain and Storage",
  "E-Learning Providers",
  "Advertising Services",
  "Marketing Services",
  "Public Relations and Communications Services",
  "Media Production and Publishing",
  "Legal Services",
  "Law Practice",
  "Government Administration",
]

const SENIORITIES = [
  "Founder/Owner",
  "C-Suite",
  "Partner",
  "Vice President",
  "Head",
  "Director",
  "Manager",
  "Senior",
  "Entry",
  "Intern",
]

const EMPLOYEE_RANGES = [
  { label: "1-10", min: 1, max: 10 },
  { label: "11-50", min: 11, max: 50 },
  { label: "51-200", min: 51, max: 200 },
  { label: "201-500", min: 201, max: 500 },
  { label: "501-1000", min: 501, max: 1000 },
  { label: "1001-5000", min: 1001, max: 5000 },
  { label: "5001+", min: 5001, max: 999999 },
]

const COUNTRIES = [
  { label: "France", labelEn: "France", code: "FR" },
  { label: "Belgique", labelEn: "Belgium", code: "BE" },
  { label: "Suisse", labelEn: "Switzerland", code: "CH" },
  { label: "Allemagne", labelEn: "Germany", code: "DE" },
  { label: "Espagne", labelEn: "Spain", code: "ES" },
  { label: "Italie", labelEn: "Italy", code: "IT" },
  { label: "Pays-Bas", labelEn: "Netherlands", code: "NL" },
  { label: "Royaume-Uni", labelEn: "United Kingdom", code: "GB" },
  { label: "États-Unis", labelEn: "United States", code: "US" },
  { label: "Canada", labelEn: "Canada", code: "CA" },
]

interface SearchResult {
  imported: number
  total: number
  pages: number
  currentPage: number
  preview: { firstName: string; lastName: string; company: string; position: string; email: string }[]
}

export default function SearchPage() {
  const [industries, setIndustries]     = useState<string[]>([])
  const [seniorities, setSeniorities]   = useState<string[]>([])
  const [employeeRanges, setEmployeeRanges] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>(["FR"])
  const [jobTitles, setJobTitles]       = useState("")
  const [limit, setLimit]               = useState(25)
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<SearchResult | null>(null)
  const [error, setError]               = useState("")

  const toggle = (arr: string[], val: string, set: (a: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const buildFilters = () => {
    const filters: Record<string, unknown> = {}

    if (industries.length > 0) {
      filters.company_industry = { include: industries }
    }
    if (seniorities.length > 0) {
      filters.person_seniority = { include: seniorities }
    }
    if (countries.length > 0) {
      // Prospeo attend le nom du pays en anglais dans person_location_search
      const countryNames = countries.map(code => {
        const found = COUNTRIES.find(c => c.code === code)
        return found?.labelEn || code
      })
      filters.person_location_search = {
        include: countryNames.map(name => ({ country: name }))
      }
    }
    if (jobTitles.trim()) {
      filters.person_job_title = {
        include: jobTitles.split(",").map(t => t.trim()).filter(Boolean)
      }
    }

    return filters
  }

  const handleSearch = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    const filters = buildFilters()

    const res = await fetch("/api/prospects/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters, limit }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setError(data.error + (data.details ? " — " + JSON.stringify(data.details) : ""))
    } else {
      setResult(data)
    }
  }

  const CheckGroup = ({
    label, options, selected, onToggle,
  }: {
    label: string
    options: string[]
    selected: string[]
    onToggle: (v: string) => void
  }) => (
    <div>
      <label className="label mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors
              ${selected.includes(opt)
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-surface-0 text-ink-secondary border-surface-border hover:border-brand-500"
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1>Recherche Prospeo</h1>
        <p className="text-ink-muted mt-1">
          Cherche dans 200M+ contacts et importe directement avec emails vérifiés
        </p>
      </div>

      <div className="card space-y-6">
        <CheckGroup
          label="Secteur"
          options={INDUSTRIES}
          selected={industries}
          onToggle={v => toggle(industries, v, setIndustries)}
        />

        <div>
          <label className="label">Intitulés de poste (séparés par des virgules)</label>
          <input
            className="input"
            placeholder="ex: Gérant, DSI, Responsable IT, CTO, Directeur informatique"
            value={jobTitles}
            onChange={e => setJobTitles(e.target.value)}
          />
        </div>

        <CheckGroup
          label="Séniorité"
          options={SENIORITIES}
          selected={seniorities}
          onToggle={v => toggle(seniorities, v, setSeniorities)}
        />

        <CheckGroup
          label="Taille entreprise"
          options={EMPLOYEE_RANGES.map(r => r.label)}
          selected={employeeRanges}
          onToggle={v => toggle(employeeRanges, v, setEmployeeRanges)}
        />

        <CheckGroup
          label="Pays"
          options={COUNTRIES.map(c => c.label)}
          selected={COUNTRIES.filter(c => countries.includes(c.code)).map(c => c.label)}
          onToggle={v => {
            const code = COUNTRIES.find(c => c.label === v)?.code || v
            toggle(countries, code, setCountries)
          }}
        />

        <div className="flex items-end gap-4">
          <div>
            <label className="label">Nombre de prospects à importer</label>
            <select
              className="input w-40"
              value={limit}
              onChange={e => setLimit(parseInt(e.target.value))}
            >
              <option value={25}>25 prospects</option>
              <option value={50}>50 prospects</option>
            </select>
            <p className="text-xs text-ink-muted mt-1">Max 50 par recherche (1 crédit/25)</p>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary h-10"
          >
            {loading ? "Recherche en cours…" : "Lancer la recherche"}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="card bg-danger-50 border-danger-600">
          <p className="text-danger-600 text-sm">⚠ {error}</p>
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div className="space-y-4">
          <div className="card bg-success-50 border-success-600">
            <p className="text-success-600 font-medium">
              ✓ {result.imported} prospects importés avec emails vérifiés
              · {result.total.toLocaleString()} résultats totaux dans Prospeo
            </p>
            <p className="text-xs text-success-600 mt-1">
              Retrouve-les dans la page <a href="/prospects" className="underline">Prospects</a>
            </p>
          </div>

          {result.preview.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-ink-muted font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-ink-muted font-medium">Entreprise</th>
                    <th className="px-4 py-3 text-left text-ink-muted font-medium">Poste</th>
                    <th className="px-4 py-3 text-left text-ink-muted font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((p, i) => (
                    <tr key={i} className="border-b border-surface-border hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium">{p.firstName} {p.lastName}</td>
                      <td className="px-4 py-3 text-ink-secondary">{p.company}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.position}</td>
                      <td className="px-4 py-3 font-mono text-xs text-success-600">{p.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
