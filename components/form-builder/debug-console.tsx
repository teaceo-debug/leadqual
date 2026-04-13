'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface DebugLog {
  time: string
  source: 'system' | 'client' | 'server' | 'gate' | 'pixel' | 'error'
  event: string
  detail: string
}

interface DebugConsoleProps {
  logs: DebugLog[]
  tracking: Record<string, string>
  formData: Record<string, string>
  gateStatus: 'pending' | 'qualified' | 'disqualified' | null
  onClose: () => void
}

const sourceColors: Record<string, { bg: string; text: string }> = {
  system: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  client: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  server: { bg: 'bg-green-500/10', text: 'text-green-400' },
  gate: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  pixel: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  error: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

export function DebugConsole({ logs, tracking, formData, gateStatus, onClose }: DebugConsoleProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 flex flex-col border-l"
      style={{
        width: collapsed ? 48 : 380,
        background: '#0a0b10',
        borderColor: '#1c1d28',
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        fontSize: 11,
        color: '#6b7394',
        transition: 'width 0.2s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 shrink-0" style={{ borderBottom: '1px solid #1c1d28' }}>
        {!collapsed && (
          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>
            PIXEL FUNNEL — LIVE
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="px-2 py-1 rounded text-xs"
            style={{ background: '#1c1d28', color: '#6b7394' }}
          >
            {collapsed ? '◂' : '▸'}
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded text-xs"
            style={{ background: '#1c1d28', color: '#6b7394' }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Tracking Params */}
          <Section title="TRACKING PARAMS" color="#60a5fa">
            {Object.entries(tracking).map(([k, v]) => (
              <Row key={k} label={k} value={v || '—'} />
            ))}
          </Section>

          {/* Form Data */}
          <Section title="FORM DATA" color="#fbbf24">
            {Object.keys(formData).length === 0 ? (
              <div style={{ color: '#333' }}>No answers yet</div>
            ) : (
              Object.entries(formData).map(([k, v]) => (
                <Row key={k} label={k.slice(0, 20)} value={v} />
              ))
            )}
          </Section>

          {/* Gate Status */}
          <div
            className="rounded-lg p-2.5"
            style={{
              background: gateStatus === null ? '#0e0f16' : gateStatus === 'qualified' ? '#051a0e' : '#1a0508',
              border: `1px solid ${gateStatus === null ? '#1c1d28' : gateStatus === 'qualified' ? '#166534' : '#991b1b'}`,
            }}
          >
            <div
              style={{
                color: gateStatus === null ? '#555' : gateStatus === 'qualified' ? '#4ade80' : '#f87171',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {gateStatus === null
                ? 'GATE: Awaiting submission'
                : gateStatus === 'qualified'
                  ? '✓ QUALIFIED — CAPI fired'
                  : '✗ DISQUALIFIED — CAPI blocked'}
            </div>
          </div>

          {/* Event Log */}
          <Section title="EVENT LOG" color="#4ade80">
            {logs.length === 0 ? (
              <div style={{ color: '#333' }}>Waiting for events...</div>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className="pb-2 mb-2"
                  style={{ borderBottom: i < logs.length - 1 ? '1px solid #15161f' : 'none' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color: '#444', fontSize: 10 }}>{l.time}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${sourceColors[l.source]?.bg} ${sourceColors[l.source]?.text}`}
                    >
                      {l.source}
                    </span>
                    <span
                      style={{
                        color:
                          l.event.includes('CAPI') || l.event === 'SEED UPDATED' ? '#4ade80' :
                          l.event === 'DISQUALIFIED' ? '#f87171' :
                          l.event === 'QUALIFIED' ? '#4ade80' : '#93a3c0',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      {l.event}
                    </span>
                  </div>
                  <div style={{ color: '#4a5168', fontSize: 11, lineHeight: 1.5 }}>{l.detail}</div>
                </div>
              ))
            )}
          </Section>

          {/* Architecture */}
          <div className="rounded-lg p-2.5" style={{ background: '#0e0f16', border: '1px solid #1c1d28', lineHeight: 1.8, fontSize: 10, color: '#3a3f52' }}>
            <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 4, fontSize: 11 }}>PIXEL FLOW</div>
            <div>Ad → PageView <span style={{ color: '#60a5fa' }}>(client)</span></div>
            <div>Form Open → ViewContent <span style={{ color: '#60a5fa' }}>(client)</span></div>
            <div>Submit → Lead <span style={{ color: '#4ade80' }}>(CAPI + score)</span></div>
            <div>+ Lead <span style={{ color: '#60a5fa' }}>(client dedup)</span></div>
            <div>Convert → Purchase <span style={{ color: '#4ade80' }}>(CAPI + score)</span></div>
            <div style={{ color: '#4ade80', marginTop: 4 }}>Score fed back as value → Lookalike optimizes</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: '#0e0f16', border: '1px solid #1c1d28' }}>
      <div style={{ color, fontWeight: 600, fontSize: 11, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 mb-0.5">
      <span style={{ color: '#4a5168', minWidth: 90 }}>{label}:</span>
      <span style={{ color: '#7c85a0', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
