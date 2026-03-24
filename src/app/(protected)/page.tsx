'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { usePipeline } from '@/hooks/usePipeline'
import type { Opportunity, NextAction } from '@/lib/db/schema'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Sparks':          { bg: '#fff5f2', color: '#e8490f', border: '#f0c0b0' },
  'Evaluating':      { bg: '#fff9e8', color: '#a07010', border: '#e8d890' },
  'Reaching Out':    { bg: '#f0f5ff', color: '#2a5db0', border: '#b8c8e8' },
  'In Conversation': { bg: '#f0f8f0', color: '#1a6b1a', border: '#a8d8a8' },
  'Proposal':        { bg: '#f5f0ff', color: '#6030a0', border: '#c8b0e8' },
  'Won':             { bg: '#e8f8e8', color: '#0a5a0a', border: '#88c888' },
  'Lost':            { bg: '#f8f0f0', color: '#a03030', border: '#d8a0a0' },
  'Retired':         { bg: '#f0f0f0', color: '#888',    border: '#ccc'    },
}

const STAGES = ['Sparks', 'Evaluating', 'Reaching Out', 'In Conversation', 'Proposal', 'Won', 'Lost', 'Retired']
const STRIP_STAGES = ['Sparks', 'Evaluating', 'Reaching Out', 'In Conversation', 'Proposal']
const COMPANY_TYPES = ['Startup', 'Scale-up', 'Enterprise', 'NGO', 'Foundation', 'Government', 'Coalition', 'Other']

const STAGE_ABBREV: Record<string, string> = {
  'Sparks': 'Sparks',
  'Evaluating': 'Eval',
  'Reaching Out': 'R/O',
  'In Conversation': 'Conv',
  'Proposal': 'Prop',
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── StageBadge ───────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const c = STAGE_COLORS[stage] ?? STAGE_COLORS['Retired']
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        fontSize: 8,
        padding: '2px 7px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: "'DM Mono', monospace",
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {stage}
    </span>
  )
}

// ─── EditableField ────────────────────────────────────────────────────────────

function EditableField({
  value,
  onChange,
  multiline,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if ('selectionStart' in inputRef.current) {
        const len = inputRef.current.value.length
        inputRef.current.selectionStart = len
        inputRef.current.selectionEnd = len
      }
    }
  }, [editing])

  function handleBlur() {
    setEditing(false)
    if (draft !== value) {
      onChange(draft)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    }
    if (e.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
  }

  const sharedStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: '#1a1a1a',
    background: '#f0ede9',
    border: '1px solid #ccc8c2',
    padding: '5px 7px',
    width: '100%',
    outline: 'none',
    resize: multiline ? 'vertical' : 'none',
    lineHeight: 1.6,
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={4}
          style={sharedStyle}
        />
      )
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={sharedStyle}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: draft ? '#1a1a1a' : '#b0a8a0',
        fontStyle: draft ? 'normal' : 'italic',
        padding: '5px 7px',
        border: '1px solid transparent',
        cursor: 'text',
        lineHeight: 1.6,
        minHeight: multiline ? 64 : 28,
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        overflow: multiline ? 'visible' : 'hidden',
        textOverflow: multiline ? 'clip' : 'ellipsis',
        background: 'transparent',
      }}
    >
      {draft || placeholder || '—'}
    </div>
  )
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 8,
        fontFamily: "'DM Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: '#8a7e78',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  )
}

// ─── OpportunityCard ──────────────────────────────────────────────────────────

function OpportunityCard({
  opp,
  selected,
  onClick,
}: {
  opp: Opportunity
  selected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? '#f7f5f2' : '#fff',
        border: `1px solid ${selected || hovered ? '#1a1a1a' : '#d4d0cb'}`,
        padding: '14px 18px',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'start',
      }}
    >
      {/* Left */}
      <div>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 16,
            letterSpacing: '0.07em',
            color: '#1a1a1a',
            lineHeight: 1.2,
          }}
        >
          {opp.companyName}
        </div>
        {opp.sector && (
          <div
            style={{
              fontSize: 9,
              color: '#8a7e78',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginTop: 3,
            }}
          >
            {opp.sector}
          </div>
        )}
        {opp.scoutSummary && (
          <div
            style={{
              fontSize: 11,
              color: '#3a3530',
              lineHeight: 1.6,
              marginTop: 4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {opp.scoutSummary}
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <StageBadge stage={opp.stage} />
        {opp.companyType && (
          <span
            style={{
              fontSize: 8,
              color: '#8a7e78',
              border: '1px solid #d4d0cb',
              padding: '2px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              fontFamily: "'DM Mono', monospace",
              whiteSpace: 'nowrap',
            }}
          >
            {opp.companyType}
          </span>
        )}
        {opp.sponsor && (
          <div style={{ fontSize: 8, color: '#8a7e78', whiteSpace: 'nowrap' }}>
            {opp.sponsor}
          </div>
        )}
        <div style={{ fontSize: 8, color: '#8a7e78', whiteSpace: 'nowrap' }}>
          {formatDate(opp.createdAt)}
        </div>
      </div>
    </div>
  )
}

// ─── StageStrip ───────────────────────────────────────────────────────────────

function StageStrip({
  counts,
  filterStage,
  setFilterStage,
}: {
  counts: Record<string, number>
  filterStage: string
  setFilterStage: (s: string) => void
}) {
  const total = STRIP_STAGES.reduce((sum, s) => sum + (counts[s] || 0), 0)

  return (
    <div style={{ display: 'flex', gap: 1, height: 28, flexShrink: 0 }}>
      {STRIP_STAGES.map(stage => {
        const count = counts[stage] || 0
        const c = STAGE_COLORS[stage]
        const active = filterStage === stage
        return (
          <div
            key={stage}
            onClick={() => setFilterStage(active ? 'All' : stage)}
            title={stage}
            style={{
              flex: count,
              minWidth: count > 0 ? 20 : 0,
              background: active ? c.color : c.bg,
              border: `1px solid ${c.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              transition: 'flex 0.2s',
            }}
          >
            {count > 0 && (
              <span
                style={{
                  fontSize: 7,
                  fontFamily: "'DM Mono', monospace",
                  color: active ? '#fff' : c.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  padding: '0 4px',
                }}
              >
                {STAGE_ABBREV[stage]} {count}
              </span>
            )}
          </div>
        )
      })}
      {total === 0 && (
        <div
          style={{
            flex: 1,
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 7, color: '#8a7e78', fontFamily: "'DM Mono', monospace" }}>
            NO ACTIVE OPPORTUNITIES
          </span>
        </div>
      )}
    </div>
  )
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

function DetailPanel({
  opp,
  onClose,
  onUpdate,
  onDelete,
}: {
  opp: Opportunity
  onClose: () => void
  onUpdate: (id: string, data: Partial<Opportunity>) => Promise<Opportunity>
  onDelete: (id: string) => Promise<void>
}) {
  const [newAction, setNewAction] = useState('')
  const [newActionOwner, setNewActionOwner] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const actions: NextAction[] = Array.isArray(opp.nextActions) ? opp.nextActions : []

  function save(data: Partial<Opportunity>) {
    onUpdate(opp.id, data)
  }

  function handleAddAction() {
    if (!newAction.trim()) return
    const updated: NextAction[] = [
      ...actions,
      { id: uid(), action: newAction.trim(), owner: newActionOwner.trim() },
    ]
    save({ nextActions: updated })
    setNewAction('')
    setNewActionOwner('')
  }

  function handleRemoveAction(id: string) {
    save({ nextActions: actions.filter(a => a.id !== id) })
  }

  async function handleDelete() {
    await onDelete(opp.id)
    onClose()
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    border: '1px solid #ccc8c2',
    padding: '5px 7px',
    background: STAGE_COLORS[opp.stage]?.bg ?? '#f0f0f0',
    color: STAGE_COLORS[opp.stage]?.color ?? '#888',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  }

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }

  const separatorStyle: React.CSSProperties = {
    borderTop: '1px solid #d4d0cb',
    margin: '4px 0',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          background: '#f0ede9',
          borderBottom: '1px solid #d4d0cb',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: '0.07em',
              color: '#1a1a1a',
            }}
          >
            {opp.companyName}
          </span>
          <StageBadge stage={opp.stage} />
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: '#8a7e78',
            lineHeight: 1,
            padding: '2px 4px',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* Stage selector */}
        <div style={sectionStyle}>
          <FieldLabel>Stage</FieldLabel>
          <select
            value={opp.stage}
            onChange={e => save({ stage: e.target.value as Opportunity['stage'] })}
            style={selectStyle}
          >
            {STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Scout Summary */}
        <div style={sectionStyle}>
          <FieldLabel>Opportunity</FieldLabel>
          <EditableField
            value={opp.scoutSummary ?? ''}
            onChange={v => save({ scoutSummary: v })}
            multiline
            placeholder="Describe the opportunity..."
          />
        </div>

        {/* Two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={sectionStyle}>
            <FieldLabel>Decision Maker</FieldLabel>
            <EditableField
              value={opp.decisionMaker ?? ''}
              onChange={v => save({ decisionMaker: v })}
              placeholder="Name / role"
            />
          </div>
          <div style={sectionStyle}>
            <FieldLabel>Sector</FieldLabel>
            <EditableField
              value={opp.sector ?? ''}
              onChange={v => save({ sector: v })}
              placeholder="e.g. Climate Tech"
            />
          </div>
        </div>

        {/* Why ENSO */}
        <div style={sectionStyle}>
          <FieldLabel>Why ENSO</FieldLabel>
          <EditableField
            value={opp.source ?? ''}
            onChange={v => save({ source: v })}
            multiline
            placeholder="Why is this a good fit for ENSO?"
          />
        </div>

        {/* Source */}
        <div style={sectionStyle}>
          <FieldLabel>Source</FieldLabel>
          <EditableField
            value={opp.entrySource ?? ''}
            onChange={v => save({ entrySource: v })}
            placeholder="How did we find this?"
          />
        </div>

        <div style={separatorStyle} />

        {/* Research Notes */}
        <div style={sectionStyle}>
          <FieldLabel>Research Notes</FieldLabel>
          <EditableField
            value={opp.researchNotes ?? ''}
            onChange={v => save({ researchNotes: v })}
            multiline
            placeholder="Internal research and notes..."
          />
        </div>

        {/* LinkedIn Connections */}
        <div style={sectionStyle}>
          <FieldLabel>LinkedIn Connections</FieldLabel>
          <EditableField
            value={opp.linkedinConnections ?? ''}
            onChange={v => save({ linkedinConnections: v })}
            multiline
            placeholder="Relevant LinkedIn connections..."
          />
        </div>

        {/* Swarm Notes */}
        <div style={sectionStyle}>
          <FieldLabel>Swarm Notes</FieldLabel>
          <EditableField
            value={opp.swarmNotes ?? ''}
            onChange={v => save({ swarmNotes: v })}
            multiline
            placeholder="Notes from swarm conversations..."
          />
        </div>

        {/* Next Actions */}
        <div style={sectionStyle}>
          <FieldLabel>Next Actions</FieldLabel>

          {actions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {actions.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    background: '#f7f5f2',
                    border: '1px solid #d4d0cb',
                    padding: '6px 8px',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#1a1a1a', lineHeight: 1.5 }}>{a.action}</div>
                    {a.owner && (
                      <div style={{ fontSize: 9, color: '#8a7e78', marginTop: 2 }}>→ {a.owner}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveAction(a.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8a7e78',
                      fontSize: 14,
                      lineHeight: 1,
                      padding: '0 2px',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add action row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddAction()}
              placeholder="New action..."
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                border: '1px solid #ccc8c2',
                padding: '5px 7px',
                background: '#f0ede9',
                color: '#1a1a1a',
                outline: 'none',
                width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={newActionOwner}
                onChange={e => setNewActionOwner(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAction()}
                placeholder="Owner..."
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  border: '1px solid #ccc8c2',
                  padding: '5px 7px',
                  background: '#f0ede9',
                  color: '#1a1a1a',
                  outline: 'none',
                  flex: 1,
                }}
              />
              <button
                onClick={handleAddAction}
                disabled={!newAction.trim()}
                style={{
                  background: newAction.trim() ? '#1a1a1a' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 12px',
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  cursor: newAction.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div style={separatorStyle} />

        {/* Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Metadata</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 8, color: '#8a7e78', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 2 }}>Sponsor</div>
              <div style={{ fontSize: 9, color: '#3a3530' }}>{opp.sponsor || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#8a7e78', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 2 }}>Date Added</div>
              <div style={{ fontSize: 9, color: '#3a3530' }}>{formatDate(opp.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#8a7e78', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 2 }}>Entry Source</div>
              <div style={{ fontSize: 9, color: '#3a3530' }}>{opp.entrySource || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#8a7e78', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 2 }}>Company Type</div>
              <div style={{ fontSize: 9, color: '#3a3530' }}>{opp.companyType || '—'}</div>
            </div>
          </div>
        </div>

        <div style={separatorStyle} />

        {/* Delete */}
        {confirmDelete ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: '#fff5f5',
              border: '1px solid #d8a0a0',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: '#a03030' }}>
              Delete <strong>{opp.companyName}</strong>? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleDelete}
                style={{
                  background: '#a03030',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'transparent',
                  color: '#8a7e78',
                  border: '1px solid #ccc8c2',
                  padding: '6px 12px',
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'transparent',
              color: '#a03030',
              border: '1px solid #d8a0a0',
              padding: '7px 14px',
              fontSize: 9,
              fontFamily: "'DM Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Delete Opportunity
          </button>
        )}
      </div>
    </div>
  )
}

// ─── AddModal ─────────────────────────────────────────────────────────────────

function AddModal({
  onClose,
  onCreate,
  defaultSponsor,
}: {
  onClose: () => void
  onCreate: (data: Partial<Opportunity>) => Promise<void>
  defaultSponsor: string
}) {
  const [form, setForm] = useState<{
    companyName: string
    sector: string
    sponsor: string
    stage: string
    companyType: string
    scoutSummary: string
    decisionMaker: string
    source: string
  }>({
    companyName: '',
    sector: '',
    sponsor: defaultSponsor,
    stage: 'Sparks',
    companyType: 'Other',
    scoutSummary: '',
    decisionMaker: '',
    source: '',
  })
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.companyName.trim()) return
    setSaving(true)
    await onCreate({
      companyName: form.companyName.trim(),
      sector: form.sector.trim() || undefined,
      sponsor: form.sponsor.trim() || undefined,
      stage: form.stage as Opportunity['stage'],
      companyType: form.companyType as Opportunity['companyType'],
      scoutSummary: form.scoutSummary.trim() || undefined,
      decisionMaker: form.decisionMaker.trim() || undefined,
      source: form.source.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    border: '1px solid #ccc8c2',
    padding: '6px 8px',
    background: '#fff',
    color: '#1a1a1a',
    outline: 'none',
    width: '100%',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,26,0.55)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#f7f5f2',
          border: '1px solid #d4d0cb',
          maxWidth: 560,
          width: '100%',
          padding: 28,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20,
              letterSpacing: '0.12em',
              color: '#1a1a1a',
            }}
          >
            Add Opportunity
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#8a7e78',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Company Name */}
          <div>
            <FieldLabel>Company Name *</FieldLabel>
            <input
              value={form.companyName}
              onChange={e => set('companyName', e.target.value)}
              placeholder="Company name"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Sector + Company Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Sector</FieldLabel>
              <input
                value={form.sector}
                onChange={e => set('sector', e.target.value)}
                placeholder="e.g. Climate Tech"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Company Type</FieldLabel>
              <select
                value={form.companyType}
                onChange={e => set('companyType', e.target.value)}
                style={selectStyle}
              >
                {COMPANY_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sponsor + Stage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Sponsor</FieldLabel>
              <input
                value={form.sponsor}
                onChange={e => set('sponsor', e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Stage</FieldLabel>
              <select
                value={form.stage}
                onChange={e => set('stage', e.target.value)}
                style={selectStyle}
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scout Summary */}
          <div>
            <FieldLabel>Scout Summary</FieldLabel>
            <textarea
              value={form.scoutSummary}
              onChange={e => set('scoutSummary', e.target.value)}
              placeholder="Brief description of the opportunity..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {/* Decision Maker */}
          <div>
            <FieldLabel>Decision Maker</FieldLabel>
            <input
              value={form.decisionMaker}
              onChange={e => set('decisionMaker', e.target.value)}
              placeholder="Name / role"
              style={inputStyle}
            />
          </div>

          {/* Source */}
          <div>
            <FieldLabel>Source</FieldLabel>
            <input
              value={form.source}
              onChange={e => set('source', e.target.value)}
              placeholder="How was this found?"
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#3a3530',
                border: '1px solid #ccc8c2',
                padding: '8px 16px',
                fontSize: 9,
                fontFamily: "'DM Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.companyName.trim() || saving}
              style={{
                background: form.companyName.trim() && !saving ? '#1a1a1a' : '#ccc',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                fontSize: 9,
                fontFamily: "'DM Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                cursor: form.companyName.trim() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { opportunities, loading, error, createOpportunity, updateOpportunity, deleteOpportunity } = usePipeline()
  const { user } = useUser()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filterStage, setFilterStage] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [crudError, setCrudError] = useState<string | null>(null)

  const selected = opportunities.find(o => o.id === selectedId) ?? null

  const counts = STAGES.reduce(
    (acc, s) => ({ ...acc, [s]: opportunities.filter(o => o.stage === s).length }),
    {} as Record<string, number>
  )

  const filtered = opportunities.filter(o => {
    if (filterStage !== 'All' && o.stage !== filterStage) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        o.companyName?.toLowerCase().includes(q) ||
        o.sector?.toLowerCase().includes(q) ||
        o.sponsor?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // If selected is filtered out, keep it selected but don't remove it
  // If selected id disappears from opportunities (deleted), clear selection
  useEffect(() => {
    if (selectedId && !opportunities.find(o => o.id === selectedId)) {
      setSelectedId(null)
    }
  }, [opportunities, selectedId])

  const defaultSponsor = user?.firstName ?? ''

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      {/* Header */}
      <header
        style={{
          height: 51,
          background: '#f0ede9',
          borderBottom: '1px solid #d4d0cb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 21,
              letterSpacing: '0.28em',
              color: '#1a1a1a',
              lineHeight: 1,
            }}
          >
            ENSO
          </span>
          <span
            style={{
              fontSize: 8,
              textTransform: 'uppercase',
              color: '#8a7e78',
              letterSpacing: '0.18em',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Pipeline
          </span>
          <span
            style={{
              fontSize: 8,
              fontFamily: "'DM Mono', monospace",
              color: '#c0b8b0',
              letterSpacing: '0.1em',
            }}
          >
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              fontSize: 9,
              color: '#8a7e78',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
          </span>
          <UserButton />
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: selected ? '220px 1fr 640px' : '220px 1fr',
          height: 'calc(100vh - 51px)',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: '#ebebeb',
            borderRight: '1px solid #d4d0cb',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
          }}
        >
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              background: '#f0ede9',
              border: '1px solid #ccc8c2',
              padding: '6px 8px',
              color: '#1a1a1a',
              outline: 'none',
            }}
          />

          {/* Stage filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FieldLabel>Stage</FieldLabel>
            {['All', ...STAGES].map(s => {
              const active = filterStage === s
              const count = s === 'All' ? opportunities.length : counts[s] ?? 0
              return (
                <button
                  key={s}
                  onClick={() => setFilterStage(s)}
                  style={{
                    background: active ? '#1a1a1a' : 'transparent',
                    color: active ? '#fff' : '#3a3530',
                    border: 'none',
                    padding: '5px 8px',
                    fontSize: 9,
                    fontFamily: "'DM Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#e0deda'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span>{s}</span>
                  <span
                    style={{
                      fontSize: 8,
                      color: active ? 'rgba(255,255,255,0.7)' : '#8a7e78',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Add button at bottom */}
          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                background: '#1a1a1a',
                color: '#fff',
                border: 'none',
                width: '100%',
                padding: '10px 8px',
                fontSize: 9,
                fontFamily: "'DM Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                cursor: 'pointer',
              }}
            >
              + Add Opportunity
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main
          style={{
            background: '#f7f5f2',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Stage strip */}
          <StageStrip counts={counts} filterStage={filterStage} setFilterStage={setFilterStage} />

          {/* Filter indicator */}
          {filterStage !== 'All' && (
            <div
              style={{
                padding: '5px 14px',
                background: '#f0ede9',
                borderBottom: '1px solid #d4d0cb',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  color: '#8a7e78',
                  fontFamily: "'DM Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                Showing: {filterStage}
              </span>
              <button
                onClick={() => setFilterStage('All')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: '#8a7e78',
                  lineHeight: 1,
                  padding: '0 2px',
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Error banners */}
          {(error || crudError) && (
            <div style={{
              margin: '8px 12px 0',
              padding: '8px 12px',
              background: 'rgba(160,40,0,0.06)',
              border: '1px solid rgba(160,40,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <span style={{ fontSize: 9, color: '#8c2200', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em' }}>
                {error ?? crudError}
              </span>
              <button
                onClick={() => setCrudError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c2200', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
              >×</button>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '8px 12px', flex: 1 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  background: '#f0ede9',
                  border: '1px solid #e0dcd8',
                  padding: '14px 18px',
                  animation: 'skeleton-pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                }}>
                  <div style={{ height: 10, background: '#e0dcd8', borderRadius: 2, marginBottom: 8, width: '60%' }} />
                  <div style={{ height: 8, background: '#e0dcd8', borderRadius: 2, width: '40%' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: '#8a7e78',
                  fontFamily: "'DM Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                }}
              >
                {search || filterStage !== 'All' ? 'No matching opportunities' : 'No opportunities yet'}
              </span>
              {!search && filterStage === 'All' && (
                <button
                  onClick={() => setShowAdd(true)}
                  style={{
                    background: '#1a1a1a',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    fontSize: 9,
                    fontFamily: "'DM Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    cursor: 'pointer',
                    marginTop: 8,
                  }}
                >
                  + Add First Opportunity
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filtered.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  selected={selectedId === opp.id}
                  onClick={() => setSelectedId(selectedId === opp.id ? null : opp.id)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Detail Panel */}
        {selected && (
          <aside
            style={{
              borderLeft: '1px solid #d4d0cb',
              background: '#f7f5f2',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <DetailPanel
              opp={selected}
              onClose={() => setSelectedId(null)}
              onUpdate={async (id, data) => {
                try {
                  setCrudError(null)
                  return await updateOpportunity(id, data)
                } catch {
                  setCrudError('Failed to save changes. Please try again.')
                  throw new Error('update failed')
                }
              }}
              onDelete={async (id) => {
                try {
                  setCrudError(null)
                  await deleteOpportunity(id)
                  setSelectedId(null)
                } catch {
                  setCrudError('Failed to delete opportunity. Please try again.')
                }
              }}
            />
          </aside>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onCreate={async (data) => {
            try {
              setCrudError(null)
              return await createOpportunity(data)
            } catch {
              setCrudError('Failed to create opportunity. Please try again.')
            }
          }}
          defaultSponsor={defaultSponsor}
        />
      )}
    </div>
  )
}
