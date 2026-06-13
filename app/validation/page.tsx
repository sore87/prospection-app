"use client"
import { useEffect, useState } from "react"

interface EmailItem {
  id: string
  to: string
  subject: string
  body: string
  status: string
  generatedAt: string
  prospect: {
    firstName: string
    lastName: string
    company: string
    position: string
  }
  sequence: {
    stepNumber: number
    campaign: { name: string }
  }
}

export default function ValidationPage() {
  const [emails, setEmails]       = useState<EmailItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [preview, setPreview]     = useState<EmailItem | null>(null)
  const [editBody, setEditBody]   = useState("")
  const [sending, setSending]     = useState(false)

  const load = (status = "pending") => {
    setLoading(true)
    fetch(`/api/emails/validate?status=${status}`)
      .then(r => r.json())
      .then(d => { setEmails(d.emails); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const action = async (ids: string[], act: "approve" | "reject", body?: string) => {
    await fetch("/api/emails/validate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action: act, ...(body ? { editedBody: body } : {}) }),
    })
    setSelected(new Set())
    setPreview(null)
    load()
  }

  const sendApproved = async () => {
    setSending(true)
    const res = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    setSending(false)
    alert(`✓ ${data.sent} envoyés · ${data.bounced} bounces · ${data.errors?.length || 0} erreurs`)
    load()
  }

  const toggleSelect = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const openPreview = (email: EmailItem) => {
    setPreview(email)
    setEditBody(email.body)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Validation</h1>
          <p className="text-ink-muted mt-1">{emails.length} email(s) en attente</p>
        </div>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <>
              <button onClick={() => action([...selected], "approve")} className="btn-primary">
                ✓ Approuver ({selected.size})
              </button>
              <button onClick={() => action([...selected], "reject")} className="btn-danger">
                ✕ Rejeter ({selected.size})
              </button>
            </>
          )}
          <button onClick={() => action(emails.map(e => e.id), "approve")} className="btn-secondary">
            Tout approuver
          </button>
          <button onClick={sendApproved} disabled={sending} className="btn-primary">
            {sending ? "Envoi…" : "Envoyer les approuvés →"}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {["pending", "approved", "sent", "bounced"].map(s => (
          <button key={s} onClick={() => load(s)}
            className="btn-secondary text-xs capitalize">{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : emails.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ink-muted">Aucun email dans cette file.</p>
          <p className="text-xs text-ink-muted mt-2">Génère des emails depuis la page Campagnes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-6">
          {/* Liste */}
          <div className="col-span-2 space-y-2">
            {emails.map(e => (
              <div
                key={e.id}
                onClick={() => openPreview(e)}
                className={`card cursor-pointer transition-all hover:border-brand-500 p-4
                  ${preview?.id === e.id ? "border-brand-500 ring-1 ring-brand-500" : ""}
                `}
              >
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(e.id)}
                    onChange={() => toggleSelect(e.id)}
                    onClick={ev => ev.stopPropagation()} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink-primary truncate">
                      {e.prospect.firstName} {e.prospect.lastName}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{e.prospect.company}</p>
                    <p className="text-xs text-ink-muted truncate mt-1">{e.subject}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge-neutral text-xs">Email {e.sequence.stepNumber}</span>
                      <span className="text-xs text-ink-muted truncate">{e.sequence.campaign.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Prévisualisation */}
          <div className="col-span-3">
            {preview ? (
              <div className="card space-y-4 sticky top-6">
                <div>
                  <p className="text-xs text-ink-muted mb-1">À</p>
                  <p className="font-medium text-ink-primary">
                    {preview.prospect.firstName} {preview.prospect.lastName}
                    <span className="text-ink-muted font-normal"> · {preview.prospect.company}</span>
                  </p>
                  <p className="text-xs text-ink-muted">{preview.to}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted mb-1">Objet</p>
                  <p className="font-medium text-ink-primary">{preview.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted mb-1">Corps (modifiable)</p>
                  <textarea
                    className="input h-64 resize-none font-mono text-xs"
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => action([preview.id], "approve", editBody !== preview.body ? editBody : undefined)}
                    className="btn-primary flex-1"
                  >
                    ✓ Approuver
                  </button>
                  <button onClick={() => action([preview.id], "reject")} className="btn-danger">
                    ✕ Rejeter
                  </button>
                </div>
              </div>
            ) : (
              <div className="card h-64 flex items-center justify-center text-ink-muted text-sm">
                Clique sur un email pour le prévisualiser
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
