import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Upload, X, ArrowUpDown,
  Trash2, ChevronDown, AlertCircle, CheckCircle2,
  Save,
} from 'lucide-react';
import { upload as blobUpload } from '@vercel/blob/client';
import { supabase } from './lib/supabase';
import { fromDbRow, toDbRow } from './lib/dealMapper';

const STAGES = ['Screening', 'Underwriting', 'Bid', 'Active', 'Dead'];
const STAGE_COLORS = {
  Screening:    'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]',
  Underwriting: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
  Bid:          'bg-[#fefce8] text-[#854d0e] border-[#fef08a]',
  Active:       'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
  Dead:         'bg-[#f4f3f1] text-[#a8a5a1] border-[#d1cfc9]',
};
const ASSET_TYPES = ['Power Center','Strip Center','Grocery-Anchored','Super-Regional Mall','Regional Mall','Neighborhood Center','Net Lease','Other'];
const PIPELINE_COLUMNS = [
  { key: 'propertyName',       label: 'Property',       width: 'min-w-[200px]' },
  { key: 'market',             label: 'Market',         width: 'min-w-[130px]' },
  { key: 'assetType',          label: 'Type',           width: 'min-w-[140px]' },
  { key: 'sf',                 label: 'GLA (SF)',       width: 'min-w-[100px]' },
  { key: 'acreage',            label: 'Acreage',        width: 'min-w-[85px]'  },
  { key: 'yearBuiltRenovated', label: 'Year Built',     width: 'min-w-[105px]' },
  { key: 'parkingCount',       label: 'Parking',        width: 'min-w-[85px]'  },
  { key: 'occupancy',          label: 'Occupancy',      width: 'min-w-[95px]'  },
  { key: 'walt',               label: 'WALT',           width: 'min-w-[75px]'  },
  { key: 'askingPrice',        label: 'Purchase Price', width: 'min-w-[140px]' },
  { key: 'noi',                label: 'NOI',            width: 'min-w-[115px]' },
  { key: 'capRate',            label: 'Going-In Cap',   width: 'min-w-[115px]' },
  { key: 'broker',             label: 'Broker',         width: 'min-w-[150px]' },
  { key: 'keyAnchors',         label: 'Key Anchors',    width: 'min-w-[170px]' },
  { key: 'bidDate',            label: 'Bid Date',       width: 'min-w-[105px]' },
  { key: 'stage',              label: 'Stage',          width: 'min-w-[115px]' },
  { key: 'notes',              label: 'Notes',          width: 'min-w-[170px]' },
];
const EMPTY_FORM = {
  propertyName:'', propertyAddress:'', market:'', assetType:'',
  sf:'', acreage:'', yearBuiltRenovated:'', parkingCount:'',
  occupancy:'', walt:'', askingPrice:'', noi:'', capRate:'',
  broker:'', keyAnchors:'', bidDate:'', stage:'Screening', notes:'',
};

function cn(...c) { return c.filter(Boolean).join(' '); }

function parseSortable(v) {
  if (v==null) return '';
  const s = String(v).trim();
  const n = Number(s.replace(/[$,%\s]/g,'').replace(/,/g,''));
  return !Number.isNaN(n) && /\d/.test(s) ? n : s.toLowerCase();
}

// Display-only: format a stored price string as "$X,XXX,XXX".
// Returns null for blank/null or any value that isn't a clean bare number
// after stripping $ , and whitespace (e.g. "Best Offer", "$20M" → null → em dash).
function formatUSD(v) {
  if (v == null || v === '') return null;
  const cleaned = String(v).replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return '$' + Math.round(n).toLocaleString('en-US');
}

// Display-only: normalize a WALT-ish string ("±4.8 Yrs.", "24.387", "4.8")
// to a plain "N.N" form. Returns null if no number is found.
function formatWalt(v) {
  if (v == null || v === '') return null;
  const m = String(v).match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(1);
}

function getSortValue(deal, key) {
  if (key==='stage') return STAGES.indexOf(deal.stage)??99;
  return parseSortable(deal[key]);
}

function StageBadge({ stage }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-[3px] border px-[6px] py-[2px] text-[9px] font-bold tracking-[.04em] uppercase',
      STAGE_COLORS[stage] || STAGE_COLORS.Screening
    )}>
      {stage}
    </span>
  );
}

// ── SUPPORT TAB COMPONENTS ──────────────────────────────────────────────────

function SupportCard({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',overflow:'hidden',boxShadow:'var(--sh)'}}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'var(--surface2)',border:'none',borderBottom: open ? '1px solid var(--border)' : 'none',cursor:'pointer',textAlign:'left'}}
      >
        <div style={{width:6,height:6,borderRadius:'50%',background: open ? '#16a34a' : 'var(--border2)',flexShrink:0,transition:'background .2s'}}/>
        <span style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--muted)',flex:1}}>{title}</span>
        <ChevronDown style={{width:12,height:12,color:'var(--dim)',transform: open ? 'rotate(180deg)' : 'none',transition:'transform .2s',flexShrink:0}}/>
      </button>
      {open && <div style={{padding:'16px'}}>{children}</div>}
    </div>
  );
}

function HurdlesFields() {
  const DEFAULTS = {goingInCap:'6.5%',leveredIRR:'15.0%',cashOnCash:'8.0%',debtYield:'9.0%',dscr:'1.25x',maxLTV:'65%',assumedRate:'6.5%',assumedLTV:'60%'};
  const [h, setH] = useState({...DEFAULTS});
  const setVal = (k,v) => setH(p=>({...p,[k]:v}));
  const HF = ({k, label, hint}) => (
    <div style={{display:'flex',flexDirection:'column',gap:3}}>
      <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--muted)'}}>{label}</div>
      <input value={h[k]} onChange={e=>setVal(k,e.target.value)}
        style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'5px',padding:'7px 10px',fontSize:'13px',fontWeight:600,fontFamily:'inherit',color:'var(--text)',outline:'none',textAlign:'center',width:'100%',transition:'border-color .15s'}}
        onFocus={e=>e.target.style.borderColor='var(--accent)'}
        onBlur={e=>e.target.style.borderColor='var(--border2)'}
      />
      <div style={{fontSize:'9px',color:'var(--dim)',textAlign:'center'}}>{hint}</div>
    </div>
  );
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        <HF k="goingInCap"  label="Going-In Cap"  hint="min. cap rate"/>
        <HF k="leveredIRR"  label="Levered IRR"   hint="hurdle return"/>
        <HF k="cashOnCash"  label="Cash-on-Cash"  hint="year 1 CoC"/>
        <HF k="debtYield"   label="Debt Yield"    hint="NOI / loan"/>
        <HF k="dscr"        label="DSCR"          hint="min. coverage"/>
        <HF k="maxLTV"      label="Max LTV"       hint="loan-to-value"/>
        <HF k="assumedRate" label="Assumed Rate"  hint="interest rate"/>
        <HF k="assumedLTV"  label="Assumed LTV"   hint="underwrite LTV"/>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={()=>setH({...DEFAULTS})}
          style={{padding:'5px 12px',borderRadius:'5px',fontSize:'11px',fontWeight:600,cursor:'pointer',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--muted)',transition:'all .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--muted)';}}
        >Reset to Defaults</button>
        <span style={{fontSize:'10px',color:'var(--dim)'}}>Screener integration is planned for a future phase. These values are reference defaults.</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

// KPI tile — Tier 2 strip pattern from examples/DESIGN_TOKENS.md §2.1.
// White surface, hairline border, red bullet + thin uppercase label,
// mono-tabular numeric, small delta subline. `subTone`: 'neutral' (default) |
// 'positive' (green) | 'negative' (red-deep). Red is restricted to the bullet
// marker and negative-delta text so the strip stays inside the single-accent
// discipline defined in DESIGN_TOKENS.md.
function KpiTile({ label, value, subline, subTone = 'neutral' }) {
  const subColor =
    subTone === 'positive' ? 'var(--lsg-positive)'
    : subTone === 'negative' ? 'var(--lsg-red-deep)'
    : 'var(--lsg-text-tertiary)';
  return (
    <div style={{
      background:'var(--lsg-surface)',
      border:'1px solid var(--lsg-border)',
      borderRadius:'4px',
      padding:'14px 16px',
      boxShadow:'var(--sh)',
      display:'flex',flexDirection:'column',gap:3,minHeight:92,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:7}}>
        <span style={{
          width:5,height:5,borderRadius:'50%',
          background:'var(--lsg-red)',flexShrink:0,
        }}/>
        <span style={{
          fontSize:'10px',fontWeight:500,textTransform:'uppercase',
          letterSpacing:'.08em',color:'var(--lsg-text-tertiary)',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',
        fontSize:'28px',fontWeight:500,color:'var(--lsg-text-primary)',
        lineHeight:1.05,marginTop:4,
      }}>{value}</div>
      <div style={{fontSize:'11px',color:subColor,marginTop:2}}>{subline}</div>
    </div>
  );
}

// Compact USD for KPI tile values: $1.65b / $42.0m / $240k / $240.
function formatCompactUSD(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'b';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
  if (abs >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n);
}

// Shared input/select class
const INPUT_CLS = 'w-full rounded-[5px] border border-[#d1cfc9] bg-[#f4f3f1] px-[10px] py-[7px] text-[12px] text-[#1a1917] outline-none focus:border-[#1a1917] transition-colors';

function FF({ label, value, onChange, placeholder, type='text', multiline=false, children }) {
  return (
    <label className="block">
      <div className="mb-[4px] text-[10px] font-bold uppercase tracking-[.06em] text-[#6b6864]">{label}</div>
      {children ? children : multiline
        ? <textarea className={cn(INPUT_CLS, 'min-h-[80px] resize-y')} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
        : <input className={INPUT_CLS} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
      }
    </label>
  );
}

function DealForm({ initial, title, subtitle, onSave, onClose, showIngest=false, onIngested }) {
  const [form, setForm] = useState({...EMPTY_FORM, ...initial});
  const [omFile, setOmFile] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestWarn, setIngestWarn] = useState('');
  const [ingestDone, setIngestDone] = useState(false);
  const [missing, setMissing] = useState([]);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // Phase 3 two-agent ingest flow:
  //   1. Stage the PDF in Vercel Blob via /api/blob-upload (client helper).
  //   2. POST { filename, url } to /api/ingest-om; the route runs Reader +
  //      Standardizer, sanitizes output, and INSERTS the deal into Supabase.
  //   3. Parent (App) receives the new dealId via onIngested, re-fetches the
  //      row, and auto-opens it in the edit modal per the preflight locked rule.
  //
  // Extracted field values are never trusted directly from the API response —
  // the canonical record comes from Supabase after the insert.
  async function handleIngest() {
    if (!omFile) return;
    setIngesting(true); setIngestError(''); setIngestDone(false); setMissing([]);
    try {
      // 1. Stage the PDF — @vercel/blob/client hits /api/blob-upload for a token,
      // then streams the file directly to Blob storage and returns the URL.
      const blob = await blobUpload(omFile.name, omFile, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
      });

      // 2. Trigger the two-agent ingest + Supabase write.
      const resp = await fetch('/api/ingest-om', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: omFile.name, url: blob.url }),
      });
      let data = null;
      try { data = await resp.json(); } catch { /* fall through */ }

      if (!resp.ok || !data || data.ok !== true) {
        const stage = data?.stage ? `[${data.stage}] ` : '';
        const msg = data?.error || `Ingest failed (HTTP ${resp.status}).`;
        throw new Error(stage + msg);
      }

      // 3. Hand the dealId off to the parent so it can re-fetch and auto-open.
      setIngestDone(true);
      onIngested?.(data.dealId, {
        fieldsPopulated: data.fieldsPopulated ?? null,
        conflicts: data.conflicts ?? 0,
        confidence: data.confidence ?? null,
      });
    } catch (err) {
      setIngestError(err?.message || 'Failed to ingest.');
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,.45)'}}>
      <div className="flex w-full max-w-2xl flex-col max-h-[85vh]" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',boxShadow:'var(--sh-lg)'}}>

        {/* Modal header */}
        <div className="flex items-center justify-between flex-shrink-0" style={{padding:'14px 18px',borderBottom:'1px solid var(--border)'}}>
          <div>
            <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)'}}>{title}</div>
            {subtitle && <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--dim)',fontSize:'20px',lineHeight:1,padding:'2px 6px'}}
            onMouseEnter={e=>e.currentTarget.style.color='var(--text)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--dim)'}
          >✕</button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 space-y-4" style={{padding:'16px 18px'}}>

          {/* OM Ingest card */}
          {showIngest && (
            <div style={{border:'1px solid var(--border)',borderRadius:'8px',overflow:'hidden',boxShadow:'var(--sh)'}}>
              <div className="flex items-center gap-2" style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface2)'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background: ingesting ? '#b45309' : ingestDone && !ingestError ? '#16a34a' : 'var(--border2)',flexShrink:0,transition:'background .2s'}}/>
                <span style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--muted)'}}>
                  OM Upload — AI Extract
                </span>
                <span style={{fontSize:'10px',color:'var(--dim)',marginLeft:'auto'}}>optional</span>
              </div>

              <div className="space-y-3" style={{padding:'14px'}}>
                {/* Drop zone / file selector */}
                <label style={{
                  display:'block',border:'1.5px dashed var(--border2)',borderRadius:'8px',
                  padding:'20px',textAlign:'center',cursor:'pointer',
                  background: omFile ? 'var(--surface)' : 'var(--surface2)',
                  transition:'all .2s',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='var(--surface3)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.background=omFile?'var(--surface)':'var(--surface2)';}}
                >
                  {omFile ? (
                    <div>
                      <div style={{fontSize:'12px',fontWeight:600,color:'var(--text)'}}>{omFile.name}</div>
                      <div style={{fontSize:'10px',color:'var(--dim)',marginTop:'3px'}}>{(omFile.size/1024/1024).toFixed(1)} MB — click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:'26px',marginBottom:'6px',opacity:.35}}>📄</div>
                      <div style={{fontSize:'12px',color:'var(--muted)'}}>Click to choose a PDF</div>
                      <div style={{fontSize:'10px',color:'var(--dim)',marginTop:'3px'}}>Up to 50 MB · offering memoranda only</div>
                    </div>
                  )}
                  <input type="file" accept=".pdf" className="hidden" onChange={e=>{
                    const file = e.target.files?.[0];
                    setIngestDone(false); setIngestError(''); setIngestWarn('');
                    if (file) {
                      if (file.size > 50 * 1024 * 1024) {
                        setIngestError('File is too large (over 50 MB). Please choose a smaller PDF or compress it.');
                        setOmFile(null);
                      } else {
                        setOmFile(file);
                        if (file.size > 25 * 1024 * 1024) setIngestWarn('Large file — extraction may be slow.');
                      }
                    } else { setOmFile(null); }
                  }}/>
                </label>

                {/* Extract button */}
                <button
                  onClick={handleIngest}
                  disabled={!omFile || ingesting}
                  style={{
                    display:'inline-flex',alignItems:'center',gap:'6px',
                    padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,
                    cursor: !omFile||ingesting ? 'not-allowed' : 'pointer',
                    background: !omFile||ingesting ? 'var(--border2)' : 'var(--accent)',
                    color:'#fff',border:'none',transition:'all .15s',
                    opacity: !omFile||ingesting ? .6 : 1,
                  }}
                >
                  {ingesting
                    ? <><span style={{width:12,height:12,border:'1.5px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .6s linear infinite'}}/>Extracting…</>
                    : <><Upload style={{width:12,height:12}}/>Extract with AI</>
                  }
                </button>

                {/* Feedback strips */}
                {ingestError && (
                  <div className="flex items-start gap-2" style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'5px',padding:'8px 10px',fontSize:'11px',color:'#991b1b'}}>
                    <AlertCircle style={{width:14,height:14,flexShrink:0,marginTop:1}}/>
                    {ingestError}
                  </div>
                )}
                {ingestWarn && !ingestError && (
                  <div className="flex items-start gap-2" style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'5px',padding:'8px 10px',fontSize:'11px',color:'#92400e'}}>
                    <AlertCircle style={{width:14,height:14,flexShrink:0,marginTop:1}}/>
                    {ingestWarn}
                  </div>
                )}
                {ingestDone && !ingestError && (
                  <div className="flex flex-wrap items-start gap-2" style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'5px',padding:'8px 10px',fontSize:'11px',color:'#15803d'}}>
                    <CheckCircle2 style={{width:14,height:14,flexShrink:0,marginTop:1}}/>
                    <span>Fields extracted. Review below and fill any gaps.
                      {missing.length > 0 && <span style={{color:'#92400e',marginLeft:6}}>Missing: {missing.join(', ')}</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deal fields */}
          <div className="grid gap-3 md:grid-cols-2">
            <FF label="Property Name" value={form.propertyName} onChange={v=>set('propertyName',v)} placeholder="Promenade at Casa Grande"/>
            <FF label="Property Address" value={form.propertyAddress} onChange={v=>set('propertyAddress',v)} placeholder="1005 N Promenade Pkwy, Casa Grande, AZ"/>
            <FF label="Market" value={form.market} onChange={v=>set('market',v)} placeholder="Phoenix, AZ"/>
            <FF label="Asset Type" value={form.assetType} onChange={v=>set('assetType',v)}>
              <select className={INPUT_CLS} value={form.assetType} onChange={e=>set('assetType',e.target.value)}>
                <option value="">Select type…</option>
                {ASSET_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </FF>
            <FF label="GLA (SF)" value={form.sf} onChange={v=>set('sf',v)} placeholder="480,588"/>
            <FF label="Acreage" value={form.acreage} onChange={v=>set('acreage',v)} placeholder="71.64"/>
            <FF label="Year Built / Renovated" value={form.yearBuiltRenovated} onChange={v=>set('yearBuiltRenovated',v)} placeholder="2007"/>
            <FF label="Parking Count" value={form.parkingCount} onChange={v=>set('parkingCount',v)} placeholder="3,335"/>
            <FF label="Occupancy" value={form.occupancy} onChange={v=>set('occupancy',v)} placeholder="85.7%"/>
            <FF label="WALT (yrs)" value={form.walt} onChange={v=>set('walt',v)} placeholder="6.34"/>
            <FF label="Purchase Price" value={form.askingPrice} onChange={v=>set('askingPrice',v)} placeholder="Analyst-entered — e.g. $65,000,000"/>
            <FF label="NOI" value={form.noi} onChange={v=>set('noi',v)} placeholder="$4,592,150"/>
            <FF label="Going-In Cap Rate" value={form.capRate} onChange={v=>set('capRate',v)} placeholder="Analyst-entered — e.g. 7.0%"/>
            <FF label="Broker / Source" value={form.broker} onChange={v=>set('broker',v)} placeholder="Colliers — El Warner"/>
            <FF label="Key Anchors" value={form.keyAnchors} onChange={v=>set('keyAnchors',v)} placeholder="Ross, Marshalls, HomeGoods"/>
            <FF label="Bid Date" value={form.bidDate} onChange={v=>set('bidDate',v)} type="date"/>
            <FF label="Stage" value={form.stage} onChange={v=>set('stage',v)}>
              <select className={INPUT_CLS} value={form.stage} onChange={e=>set('stage',e.target.value)}>
                {STAGES.map(s=><option key={s}>{s}</option>)}
              </select>
            </FF>
          </div>
          <FF label="Notes" value={form.notes} onChange={v=>set('notes',v)} placeholder="IC thesis, open items, sourcing context…" multiline/>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0" style={{padding:'12px 18px',borderTop:'1px solid var(--border)'}}>
          <button onClick={onClose} style={{padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',cursor:'pointer',transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}
          >Cancel</button>
          <button onClick={()=>onSave(form)} className="inline-flex items-center gap-[5px]" style={{padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--lsg-red-deep)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--accent)'}
          >
            <Save style={{width:13,height:13}}/> Save Deal
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── ONE PAGER TAB ───────────────────────────────────────────────────────────

function OnePagerTab({ deals }) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!deals.length) { setSelectedId(''); return; }
    if (!selectedId || !deals.find(d => d.id === selectedId)) {
      setSelectedId(deals[0].id);
    }
  }, [deals, selectedId]);

  const deal = deals.find(d => d.id === selectedId);
  const generatedAt = new Date().toLocaleString('en-US', {
    month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit',
  });

  // Empty state — no deals at all
  if (!deals.length) {
    return (
      <div style={{
        background:'var(--lsg-surface)',
        border:'1px solid var(--lsg-border-strong)',borderRadius:'8px',
        boxShadow:'var(--sh)',padding:'64px 24px',textAlign:'center',
      }}>
        <div style={{
          width:32,height:2,background:'var(--lsg-red)',
          margin:'0 auto 18px',
        }}/>
        <div style={{
          fontSize:'13px',fontWeight:500,
          color:'var(--lsg-text-primary)',marginBottom:4,
        }}>
          Select a deal from the pipeline to preview a one-pager.
        </div>
        <div style={{fontSize:'11px',color:'var(--lsg-text-tertiary)'}}>
          Add a deal in the PIPELINE tab to get started.
        </div>
      </div>
    );
  }

  if (!deal) return null;

  // Styles
  const appCardStyle = {
    background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',
    boxShadow:'var(--sh)',overflow:'hidden',
  };
  const ghostBtn = {
    padding:'6px 11px',fontSize:'11px',fontWeight:600,cursor:'pointer',
    border:'1px solid var(--lsg-border-strong)',background:'var(--lsg-surface-alt)',
    color:'var(--lsg-text-secondary)',
    borderRadius:'5px',fontFamily:'inherit',transition:'all .15s',
  };
  const primaryBtn = {
    ...ghostBtn,
    background:'var(--lsg-red)',color:'#fff',borderColor:'var(--lsg-red)',
  };

  // Paper-style one-pager inner styles — token-aligned (DESIGN_TOKENS.md).
  // Structure is inspired by examples/lsg_one_pager_v4.html (dark section-header
  // strip, three-box header row, dense KV grid), scaled up from 7.5–9px print
  // sizes to screen-readable 9.5–11px. Palette stays in warm grayscale; red is
  // reserved for the Print/Export CTA and the header rule.
  const paperStyle = {
    background:'var(--lsg-surface)',
    border:'1px solid var(--lsg-border-strong)',
    borderRadius:'4px',
    boxShadow:'0 1px 2px rgba(0,0,0,.04)',overflow:'hidden',
    color:'var(--lsg-text-primary)',
  };
  const sectionHdr = {
    fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.09em',
    background:'var(--lsg-text-primary)',color:'var(--lsg-surface)',
    padding:'4px 8px',
  };
  const sectionBody = { padding:'6px 10px' };
  const kvRow = {
    display:'flex',justifyContent:'space-between',gap:6,padding:'2.5px 0',
    fontSize:'10.5px',borderBottom:'1px solid var(--lsg-border)',lineHeight:1.4,
  };
  const kvRowLast = { ...kvRow, borderBottom:'none' };
  const kvK = { color:'var(--lsg-text-tertiary)',flexShrink:0 };
  const kvV = {
    fontWeight:500,color:'var(--lsg-text-primary)',textAlign:'right',flex:1,
  };
  const kvVMono = {
    ...kvV,
    fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',
  };
  const sectionWrap = {
    border:'1px solid var(--lsg-border-strong)',borderRadius:'3px',
    overflow:'hidden',marginBottom:6,
  };

  const em = '—';
  const V = (v) => (v == null || v === '') ? em : v;

  // KV row: `mono` flag uses Geist Mono + tabular-nums for numeric values.
  const KV = ({ rows }) => (
    <div>
      {rows.map((r, i) => (
        <div key={r.k} style={i === rows.length - 1 ? kvRowLast : kvRow}>
          <span style={kvK}>{r.k}</span>
          <span style={r.mono ? kvVMono : kvV}>{V(r.v)}</span>
        </div>
      ))}
    </div>
  );

  const Section = ({ title, children, placeholder }) => (
    <div style={sectionWrap}>
      <div style={sectionHdr}>{title}</div>
      <div style={sectionBody}>
        {children}
        {placeholder && (
          <div style={{fontSize:'9px',color:'var(--lsg-text-tertiary)',fontStyle:'italic',marginTop:4}}>
            Placeholder — data not yet modeled in this deal record.
          </div>
        )}
      </div>
    </div>
  );

  // Key Anchors as a list (split on comma / newline / pipe)
  const anchors = (deal.keyAnchors || '')
    .split(/[\n,|;]/)
    .map(s => s.trim())
    .filter(Boolean);

  // Count placeholder-heavy areas so we can offer the "fields not yet available" banner
  const unavailableCount = [
    !deal.market, !deal.assetType, !deal.sf, !deal.occupancy, !deal.walt,
    !deal.askingPrice, !deal.capRate, !deal.noi, !deal.broker, !deal.bidDate,
  ].filter(Boolean).length;

  const dealTitle = deal.propertyName || 'Untitled deal';

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>

      {/* ── Action / header bar ─────────────────────────── */}
      <div style={appCardStyle}>
        <div style={{
          display:'flex',alignItems:'center',gap:14,padding:'10px 14px',flexWrap:'wrap',
        }}>
          <div style={{display:'flex',alignItems:'baseline',gap:10,flex:'1 1 auto',minWidth:0}}>
            <div style={{fontSize:'14px',fontWeight:700,color:'var(--lsg-text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {dealTitle}
            </div>
            <div style={{
              fontSize:'10px',color:'var(--lsg-text-tertiary)',whiteSpace:'nowrap',
              fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',
            }}>
              Generated {generatedAt}
            </div>
          </div>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              background:'var(--lsg-surface-alt)',
              border:'1px solid var(--lsg-border-strong)',borderRadius:'5px',
              padding:'5px 8px',fontSize:'11px',
              color:'var(--lsg-text-primary)',fontFamily:'inherit',
              outline:'none',cursor:'pointer',minWidth:200,
            }}
          >
            {deals.map(d => (
              <option key={d.id} value={d.id}>{d.propertyName || d.propertyAddress || 'Untitled deal'}</option>
            ))}
          </select>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button type="button" style={ghostBtn} disabled title="Not yet wired">Layout</button>
            <button type="button" style={ghostBtn} disabled title="Not yet wired">Edit Data</button>
            <button type="button" style={ghostBtn} disabled title="Not yet wired">DB Sync</button>
            <button type="button" style={ghostBtn} disabled title="Not yet wired">Clear</button>
            <button type="button" style={primaryBtn} disabled title="Not yet wired">Print / Export PDF</button>
          </div>
        </div>
      </div>

      {/* ── Optional gap banner — warm warning tone, token-native ─── */}
      {unavailableCount > 0 && (
        <div style={{
          background:'var(--lsg-warning-subtle)',
          border:'1px solid var(--lsg-border-strong)',
          borderRadius:'6px',
          padding:'8px 14px',fontSize:'11px',color:'var(--lsg-warning)',
          display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,
          flexWrap:'wrap',
        }}>
          <span>
            <strong style={{fontVariantNumeric:'tabular-nums'}}>{unavailableCount}</strong>
            {' '}fields not yet available — placeholders are shown where data is missing.
          </span>
          <span style={{fontSize:'10px',color:'var(--lsg-text-tertiary)'}}>
            Fill in from the Pipeline edit modal.
          </span>
        </div>
      )}

      {/* ── Paper: title block + sections ────────────────── */}
      <div style={paperStyle}>

        {/* Title strip */}
        <div style={{padding:'10px 14px 8px',borderBottom:'1px solid var(--lsg-border-strong)'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div style={{minWidth:0,flex:'1 1 60%'}}>
              <div style={{fontSize:'17px',fontWeight:700,letterSpacing:'-.005em',color:'var(--lsg-text-primary)',lineHeight:1.2}}>
                {dealTitle}
              </div>
              {deal.propertyAddress && (
                <div style={{fontSize:'10.5px',color:'var(--lsg-text-secondary)',marginTop:2}}>
                  {deal.propertyAddress}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              {deal.stage && <StageBadge stage={deal.stage} />}
              {deal.assetType && (
                <span style={{
                  fontSize:'9px',fontWeight:600,letterSpacing:'.02em',
                  background:'var(--lsg-surface-sunk)',
                  border:'1px solid var(--lsg-border)',
                  color:'var(--lsg-text-secondary)',
                  padding:'2px 7px',borderRadius:3,
                }}>{deal.assetType}</span>
              )}
              {deal.market && (
                <span style={{
                  fontSize:'9px',fontWeight:600,letterSpacing:'.02em',
                  background:'var(--lsg-surface-sunk)',
                  border:'1px solid var(--lsg-border)',
                  color:'var(--lsg-text-secondary)',
                  padding:'2px 7px',borderRadius:3,
                }}>{deal.market}</span>
              )}
            </div>
          </div>
        </div>

        {/* Three-box head row: Property / Transaction / Scorecard */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,padding:'8px 10px 4px'}}>
          {/* Property */}
          <div style={sectionWrap}>
            <div style={sectionHdr}>Property</div>
            <div style={sectionBody}>
              <KV rows={[
                {k:'Type',     v: deal.assetType},
                {k:'Size',     v: deal.sf,                                         mono:true},
                {k:'Acreage',  v: deal.acreage,                                    mono:true},
                {k:'Vintage',  v: deal.yearBuiltRenovated,                         mono:true},
                {k:'Parking',  v: deal.parkingCount,                               mono:true},
                {k:'Leasing',  v: [
                  deal.occupancy,
                  formatWalt(deal.walt) ? formatWalt(deal.walt)+' WALT' : null,
                ].filter(Boolean).join(' | ') || em,                               mono:true},
              ]}/>
            </div>
          </div>
          {/* Transaction */}
          <div style={sectionWrap}>
            <div style={sectionHdr}>Transaction</div>
            <div style={sectionBody}>
              <KV rows={[
                {k:'Status',    v: deal.stage},
                {k:'Strategy',  v: null},
                {k:'Seller',    v: null},
                {k:'Sourcing',  v: deal.broker},
                {k:'Bid Date',  v: deal.bidDate,                                   mono:true},
                {k:'Source',    v: (deal.sourceFiles && deal.sourceFiles[0]) || null},
              ]}/>
            </div>
          </div>
          {/* Scorecard (all placeholders — analyst-owned fields) */}
          <div style={sectionWrap}>
            <div style={sectionHdr}>Scorecard</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,padding:'8px 8px 10px'}}>
              {['Overall','Market','Property','Location','Biz Plan'].map(lbl => (
                <div key={lbl} style={{textAlign:'center'}}>
                  <div style={{fontSize:'8px',textTransform:'uppercase',letterSpacing:'.07em',color:'var(--lsg-text-tertiary)',fontWeight:600,marginBottom:2}}>{lbl}</div>
                  <div style={{fontSize:'15px',fontWeight:700,color:'var(--lsg-text-disabled)',fontFamily:'var(--font-mono)'}}>—</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{display:'grid',gridTemplateColumns:'1.15fr 1fr 1fr',gap:6,padding:'4px 10px 10px'}}>
          {/* Column 1 */}
          <div>
            <Section title="Summary Metrics">
              <KV rows={[
                {k:'Purchase Price', v: formatUSD(deal.askingPrice),        mono:true},
                {k:'Going-In Cap',   v: deal.capRate,                       mono:true},
                {k:'NOI',            v: deal.noi,                           mono:true},
                {k:'GLA (SF)',       v: deal.sf,                            mono:true},
                {k:'Occupancy',      v: deal.occupancy,                     mono:true},
                {k:'WALT',           v: formatWalt(deal.walt),              mono:true},
              ]}/>
            </Section>
            <Section title="Market & Submarket">
              <KV rows={[
                {k:'Market',           v: deal.market},
                {k:'Submarket',        v: null},
                {k:'Market Cap Range', v: null,                             mono:true},
                {k:'Rent Growth (3Y)', v: null,                             mono:true},
                {k:'Population (3-mi)',v: null,                             mono:true},
              ]}/>
            </Section>
          </div>
          {/* Column 2 */}
          <div>
            <Section title="Returns Summary">
              <KV rows={[
                {k:'Levered IRR',    v: null,                               mono:true},
                {k:'MOIC',           v: null,                               mono:true},
                {k:'Cash-on-Cash',   v: null,                               mono:true},
                {k:'DSCR',           v: null,                               mono:true},
                {k:'Debt Yield',     v: null,                               mono:true},
              ]}/>
            </Section>
            <Section title="Capital Sources">
              <KV rows={[
                {k:'Senior Debt',  v: null,                                 mono:true},
                {k:'LTV',          v: null,                                 mono:true},
                {k:'Rate',         v: null,                                 mono:true},
                {k:'Term',         v: null,                                 mono:true},
                {k:'Equity',       v: null,                                 mono:true},
              ]}/>
            </Section>
          </div>
          {/* Column 3 */}
          <div>
            <Section title="Sources & Uses">
              <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--lsg-text-tertiary)',marginBottom:2}}>Sources</div>
              <KV rows={[
                {k:'Senior Debt',  v: null,                                 mono:true},
                {k:'LP Equity',    v: null,                                 mono:true},
                {k:'GP Equity',    v: null,                                 mono:true},
              ]}/>
              <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--lsg-text-tertiary)',margin:'6px 0 2px'}}>Uses</div>
              <KV rows={[
                {k:'Purchase Price', v: formatUSD(deal.askingPrice),        mono:true},
                {k:'Closing Costs',  v: null,                               mono:true},
                {k:'Reserves',       v: null,                               mono:true},
              ]}/>
            </Section>
            <Section title="Key Anchors / Top Tenants">
              {anchors.length > 0 ? (
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  {anchors.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize:'10.5px',color:'var(--lsg-text-primary)',
                        padding:'2px 0',
                        borderBottom: i===anchors.length-1 ? 'none' : '1px solid var(--lsg-border)',
                      }}
                    >{a}</div>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:'10.5px',color:'var(--lsg-text-tertiary)',fontStyle:'italic'}}>
                  No anchors recorded.
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* Notes strip */}
        {deal.notes && (
          <div style={{padding:'4px 10px 10px'}}>
            <div style={sectionWrap}>
              <div style={sectionHdr}>Notes / Overview</div>
              <div style={{
                ...sectionBody,fontSize:'10.5px',
                color:'var(--lsg-text-primary)',lineHeight:1.5,whiteSpace:'pre-wrap',
              }}>{deal.notes}</div>
            </div>
          </div>
        )}

        {/* Footer strap */}
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',
          padding:'6px 14px',
          borderTop:'1px solid var(--lsg-border-strong)',background:'var(--lsg-canvas)',
          fontSize:'9px',color:'var(--lsg-text-tertiary)',
          letterSpacing:'.04em',textTransform:'uppercase',
        }}>
          <span>Confidential &amp; Proprietary — LIGHTSTONE</span>
          <span style={{fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textTransform:'none',letterSpacing:0}}>
            {new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'})}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── COMPARE TAB ─────────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { label: 'Property Name',     key: 'propertyName'    },
  { label: 'Address',           key: 'propertyAddress' },
  { label: 'Market',            key: 'market'          },
  { label: 'Asset Type',        key: 'assetType'       },
  { label: 'SF',                key: 'sf'              },
  { label: 'Occupancy',         key: 'occupancy'       },
  { label: 'WALT',              key: 'walt'            },
  { label: 'Purchase Price',    key: 'askingPrice'     },
  { label: 'Going-In Cap Rate', key: 'capRate'         },
  { label: 'NOI',               key: 'noi'             },
  { label: 'Broker',            key: 'broker'          },
  { label: 'Bid Date',          key: 'bidDate'         },
  { label: 'Stage',             key: 'stage'           },
  { label: 'Notes',             key: 'notes'           },
];

function dealLabel(d) {
  return d.propertyName || d.propertyAddress || 'Untitled deal';
}

function CompareTab({ deals }) {
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const [selC, setSelC] = useState('');

  const selected = [selA, selB, selC]
    .map(id => deals.find(d => d.id === id))
    .filter(Boolean);

  const anySelected = Boolean(selA || selB || selC);

  const cardStyle = {
    background:'var(--surface)',
    border:'1px solid var(--border)',
    borderRadius:'8px',
    boxShadow:'var(--sh)',
    overflow:'hidden',
  };
  const slotLabelStyle = {
    fontSize:'9px',fontWeight:700,textTransform:'uppercase',
    letterSpacing:'.08em',color:'var(--muted)',
  };
  const selectStyle = {
    width:'100%',background:'var(--surface2)',
    border:'1px solid var(--border2)',borderRadius:'5px',
    padding:'7px 10px',fontSize:'12px',color:'var(--text)',
    fontFamily:'inherit',outline:'none',cursor:'pointer',
  };
  const labelCellStyle = {
    fontSize:'10px',fontWeight:700,textTransform:'uppercase',
    letterSpacing:'.06em',color:'var(--muted)',
    padding:'10px 14px',borderBottom:'1px solid var(--border)',
    whiteSpace:'nowrap',verticalAlign:'top',width:180,
    background:'var(--surface)',
  };
  const valueCellStyle = {
    fontSize:'12px',color:'var(--text)',
    padding:'10px 14px',borderBottom:'1px solid var(--border)',
    borderLeft:'1px solid var(--border)',verticalAlign:'top',
    lineHeight:1.5,overflowWrap:'break-word',
  };

  const em = <span style={{color:'var(--dim)'}}>—</span>;
  const renderCell = (deal, key) => {
    const v = deal?.[key];
    if (v == null || v === '') return em;
    if (key === 'stage') return <StageBadge stage={v} />;
    return v;
  };

  const slot = (value, onChange, exclude, placeholder) => {
    const options = deals.filter(d => d.id === value || !exclude.includes(d.id));
    return (
      <select value={value} onChange={e=>onChange(e.target.value)} style={selectStyle}>
        <option value="">{placeholder}</option>
        {options.map(d => (
          <option key={d.id} value={d.id}>{dealLabel(d)}</option>
        ))}
      </select>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>

      {/* Header + selectors */}
      <div style={cardStyle}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 18px',borderBottom:'1px solid var(--border)',
          background:'var(--surface2)',
        }}>
          <div style={{fontSize:'12px',fontWeight:700,color:'var(--text)',letterSpacing:'.02em'}}>
            Side-by-Side Comparison
          </div>
          <div style={{fontSize:'10px',color:'var(--muted)'}}>
            Select 2–3 deals to compare
          </div>
        </div>
        <div style={{
          padding:'14px 18px',display:'flex',gap:12,
          alignItems:'flex-end',flexWrap:'wrap',
        }}>
          <div style={{flex:'1 1 200px',display:'flex',flexDirection:'column',gap:5}}>
            <div style={slotLabelStyle}>Deal A</div>
            {slot(selA, setSelA, [selB, selC], 'Select a deal…')}
          </div>
          <div style={{flex:'1 1 200px',display:'flex',flexDirection:'column',gap:5}}>
            <div style={slotLabelStyle}>Deal B</div>
            {slot(selB, setSelB, [selA, selC], 'Select a deal…')}
          </div>
          <div style={{flex:'1 1 200px',display:'flex',flexDirection:'column',gap:5}}>
            <div style={slotLabelStyle}>
              Deal C <span style={{textTransform:'none',fontWeight:500,color:'var(--dim)'}}>(optional)</span>
            </div>
            {slot(selC, setSelC, [selA, selB], 'Select a deal…')}
          </div>
          <button
            onClick={()=>{setSelA('');setSelB('');setSelC('');}}
            disabled={!anySelected}
            style={{
              padding:'7px 14px',borderRadius:'5px',fontSize:'11px',fontWeight:600,
              cursor: anySelected ? 'pointer' : 'default',
              border:'1px solid var(--border2)',background:'var(--surface2)',
              color:'var(--muted)',opacity: anySelected ? 1 : 0.5,
              transition:'all .15s',height:32,
            }}
          >Clear</button>
        </div>
      </div>

      {/* Empty state or comparison grid */}
      {selected.length < 2 ? (
        <div style={{...cardStyle,padding:'60px 24px',textAlign:'center'}}>
          <div style={{fontSize:'32px',marginBottom:10,opacity:.22}}>⇌</div>
          <div style={{fontSize:'12px',fontWeight:500,color:'var(--muted)',marginBottom:4}}>
            Select at least two deals to preview a side-by-side comparison.
          </div>
          <div style={{fontSize:'11px',color:'var(--dim)'}}>
            Pick from the dropdowns above.
          </div>
        </div>
      ) : (
        <div style={{...cardStyle,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:180}} />
              {selected.map(d => (
                <col key={d.id} style={{width:`calc((100% - 180px) / ${selected.length})`}} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{...labelCellStyle,background:'var(--surface2)',textAlign:'left'}}>
                  Field
                </th>
                {selected.map((d, i) => (
                  <th key={d.id} style={{
                    ...valueCellStyle,background:'var(--surface2)',
                    textAlign:'left',
                  }}>
                    <div style={{
                      fontSize:'9px',fontWeight:700,textTransform:'uppercase',
                      letterSpacing:'.08em',color:'var(--muted)',marginBottom:3,
                    }}>
                      Deal {['A','B','C'][i]}
                    </div>
                    <div style={{fontSize:'12px',fontWeight:700,color:'var(--text)'}}>
                      {dealLabel(d)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(row => (
                <tr key={row.key}>
                  <td style={labelCellStyle}>{row.label}</td>
                  {selected.map(d => (
                    <td key={d.id} style={valueCellStyle}>
                      {renderCell(d, row.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [sortKey, setSortKey] = useState('dateAdded');
  const [sortDir, setSortDir] = useState('desc');
  const [activeTab, setActiveTab] = useState('PIPELINE');
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load deals:', error);
        setDeals((data || []).map(fromDbRow));
        setLoading(false);
      });
  }, []);

  // KPI strip data. Computed entirely from in-memory `deals` — no extra fetch.
  // "Killed this month" uses updated_at as the closest available proxy for a
  // kill timestamp (no dedicated `killed_at` column exists yet); pass_reason
  // decomposition is deferred — see BACKLOG.md "Dead Deal Pass Reason Capture".
  const kpiStats = useMemo(() => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();
    const prev = new Date(curY, curM - 1, 1);
    const prevY = prev.getFullYear();
    const prevM = prev.getMonth();
    const monthLabel = (y, m) => {
      const d = new Date(y, m, 1);
      return d.toLocaleDateString('en-US', { month:'short' }) + " '" + String(y).slice(2);
    };
    const ymPrefix = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
    const curPrefix = ymPrefix(curY, curM);
    const prevPrefix = ymPrefix(prevY, prevM);

    const parseMoney = (v) => {
      if (v == null || v === '') return null;
      const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    const active = deals.filter(d => d.stage !== 'Dead');
    const activePriced = active.filter(d => parseMoney(d.askingPrice) != null).length;
    const pipelineTotal = active.reduce((acc, d) => {
      const n = parseMoney(d.askingPrice);
      return n == null ? acc : acc + n;
    }, 0);

    const addedCur = deals.filter(d => (d.dateAdded || '').startsWith(curPrefix)).length;
    const addedPrev = deals.filter(d => (d.dateAdded || '').startsWith(prevPrefix)).length;
    const killedCur = deals.filter(
      d => d.stage === 'Dead' && (d.updated_at || '').startsWith(curPrefix),
    ).length;

    return {
      activeCount: active.length,
      pipelineTotal,
      activePriced,
      addedCur, addedPrev,
      killedCur,
      curLabel: monthLabel(curY, curM),
      prevLabel: monthLabel(prevY, prevM),
    };
  }, [deals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = deals.filter(d => {
      const txt = [d.propertyName,d.propertyAddress,d.market,d.assetType,d.stage,d.broker,d.keyAnchors].join(' ').toLowerCase();
      return (!q||txt.includes(q)) && (stageFilter==='All'||d.stage===stageFilter);
    });
    return [...out].sort((a,b)=>{
      const av=getSortValue(a,sortKey), bv=getSortValue(b,sortKey);
      if(av===bv) return 0;
      return (av>bv?1:-1) * (sortDir==='asc'?1:-1);
    });
  }, [deals,search,stageFilter,sortKey,sortDir]);

  function handleSort(key) {
    if(key===sortKey) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  async function addDeal(form) {
    setShowAdd(false);
    const { data, error } = await supabase
      .from('deals')
      .insert(toDbRow(form))
      .select()
      .single();
    if (error) { console.error('Failed to save deal:', error); return; }
    setDeals(p => [fromDbRow(data), ...p]);
  }

  async function saveDeal(form) {
    setDeals(p => p.map(d => d.id === form.id ? form : d));
    setEditDeal(null);
    const { error } = await supabase
      .from('deals')
      .update(toDbRow(form))
      .eq('id', form.id);
    if (error) console.error('Failed to update deal:', error);
  }

  async function deleteDeal(id) {
    setDeals(p => p.filter(d => d.id !== id));
    setDeleteId(null);
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);
    if (error) console.error('Failed to delete deal:', error);
  }

  // Phase 3 post-ingest handoff: the server inserted the deal and returned its
  // id. Re-fetch the canonical row (do not trust the API's extracted payload),
  // insert it at the top of the pipeline, close the Add-Deal modal, and
  // auto-open the new deal in the edit modal with analyst-owned fields blank.
  async function handleIngested(dealId) {
    if (!dealId) return;
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();
    if (error || !data) {
      console.error('Failed to re-fetch ingested deal:', error);
      return;
    }
    const deal = fromDbRow(data);
    setDeals(prev => [deal, ...prev.filter(d => d.id !== dealId)]);
    setShowAdd(false);
    setEditDeal(deal);
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)'}}>

      {/* Header */}
      <header style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:40,boxShadow:'var(--sh)'}}>
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4" style={{padding:'0 24px',height:'54px'}}>
          <div className="wordmark">
            <span className="wordmark-primary">LIGHTSTONE</span>
            <span className="wordmark-secondary">/ PIPELINE</span>
          </div>
          <button
            onClick={()=>setShowAdd(true)}
            className="inline-flex items-center gap-[5px]"
            style={{padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--lsg-red-deep)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--accent)'}
          >
            <Plus style={{width:13,height:13}}/> Add Deal
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl space-y-5" style={{padding:'20px 24px'}}>

        {/* Tab strip */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',marginBottom:0}}>
          {['PIPELINE','COMPARE','ONEPAGER','SUPPORT'].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{
                padding:'8px 16px',fontSize:'11px',fontWeight:600,cursor:'pointer',
                borderBottom: activeTab===tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom:-1,
                color: activeTab===tab ? 'var(--text)' : 'var(--muted)',
                background:'none',border:'none',
                borderBottomStyle:'solid',
                borderBottomWidth:2,
                borderBottomColor: activeTab===tab ? 'var(--accent)' : 'transparent',
                textTransform:'uppercase',letterSpacing:'.06em',
                transition:'all .15s',
              }}
            >{tab === 'ONEPAGER' ? 'ONE PAGER' : tab}</button>
          ))}
        </div>

        {activeTab === 'COMPARE' && <CompareTab deals={deals} />}

        {activeTab === 'ONEPAGER' && <OnePagerTab deals={deals} />}

        {activeTab === 'SUPPORT' && (
          <div className="space-y-3">

            {/* 1. SCREENING HURDLES */}
            <SupportCard title="Screening Hurdles">
              <HurdlesFields />
            </SupportCard>

            {/* 2. SUPABASE SETUP GUIDE */}
            <SupportCard title="Supabase Setup Guide">
              <div style={{display:'flex',flexDirection:'column',gap:16,fontSize:'12px',lineHeight:1.6,color:'var(--text)'}}>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 1 — Create a Supabase project</div>
                  <p style={{color:'var(--muted)'}}>Go to <span style={{fontWeight:600,color:'var(--text)'}}>supabase.com</span> → New project. Choose a region close to your users. Once created, note your <strong>Project URL</strong> and <strong>anon/public key</strong> from Settings → API.</p>
                </div>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 2 — Create the deals table</div>
                  <p style={{color:'var(--muted)',marginBottom:8}}>Open the SQL Editor in your Supabase dashboard and run:</p>
                  <pre style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px',fontFamily:'monospace',fontSize:'10px',color:'var(--muted)',overflowX:'auto',whiteSpace:'pre',lineHeight:1.7,margin:0}}>{`CREATE TABLE deals (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at           timestamptz DEFAULT now(),
  property_name        text,
  property_address     text,
  market               text,
  asset_type           text,
  sf                   text,
  acreage              text,
  year_built_renovated text,
  parking_count        text,
  occupancy            text,
  walt                 text,
  asking_price         text,
  noi                  text,
  cap_rate             text,
  broker               text,
  key_anchors          text,
  bid_date             date,
  stage                text DEFAULT 'Screening',
  notes                text,
  raw_data             jsonb,
  source_files         text[]
);`}</pre>
                </div>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 3 — Row Level Security (RLS)</div>
                  <p style={{color:'var(--muted)',marginBottom:8}}>For an internal team tool with no user auth, the simplest path is to disable RLS entirely. If you need auth-gated access, use Option B.</p>
                  <pre style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px',fontFamily:'monospace',fontSize:'10px',color:'var(--muted)',overflowX:'auto',whiteSpace:'pre',lineHeight:1.7,margin:0}}>{`-- Option A: disable RLS (internal tool, no auth)
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;

-- Option B: enable with permissive policy (authenticated users)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_access" ON deals
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
                </div>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 4 — Add credentials to the app</div>
                  <p style={{color:'var(--muted)',marginBottom:8}}>Add both values to <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>`.env.local`</code> for local dev and to Vercel Environment Variables for production:</p>
                  <pre style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px',fontFamily:'monospace',fontSize:'10px',color:'var(--muted)',overflowX:'auto',whiteSpace:'pre',lineHeight:1.7,margin:0}}>{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}</pre>
                  <p style={{color:'var(--dim)',fontSize:'11px',marginTop:8}}>These are read by <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>src/lib/supabase.js</code> at build time via Vite's <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>import.meta.env</code>.</p>
                </div>

              </div>
            </SupportCard>

            {/* 3. GETTING YOUR ANTHROPIC API KEY */}
            <SupportCard title="Getting Your Anthropic API Key">
              <div style={{display:'flex',flexDirection:'column',gap:16,fontSize:'12px',lineHeight:1.6,color:'var(--text)'}}>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 1 — Create or sign into your Anthropic account</div>
                  <p style={{color:'var(--muted)'}}>Go to <span style={{fontWeight:600,color:'var(--text)'}}>console.anthropic.com</span> and sign up or log in.</p>
                </div>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 2 — Generate an API key</div>
                  <p style={{color:'var(--muted)'}}>In the Console, go to <strong>API Keys</strong> → <strong>Create Key</strong>. Copy the key immediately — it will not be shown again.</p>
                </div>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 3 — Add a payment method</div>
                  <p style={{color:'var(--muted)'}}>Go to <strong>Settings → Billing</strong> and add a credit card. PDF extraction uses Claude Haiku, which is very low cost — typically a few cents per document.</p>
                </div>

                <div>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--muted)',marginBottom:6}}>Step 4 — Add the key to the app</div>
                  <p style={{color:'var(--muted)',marginBottom:8}}>The fast-pass extraction calls the Anthropic API <strong>directly from the browser</strong> using the key prefixed with <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>VITE_</code>:</p>
                  <pre style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px',fontFamily:'monospace',fontSize:'10px',color:'var(--muted)',overflowX:'auto',whiteSpace:'pre',lineHeight:1.7,margin:0}}>{`# .env.local (local dev)
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Also add to Vercel → Settings → Environment Variables
# (Production + Preview environments)`}</pre>
                  <p style={{color:'var(--dim)',fontSize:'11px',marginTop:8}}>The request includes <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>anthropic-dangerous-direct-browser-access: true</code>, which Anthropic requires to allow browser-origin API calls. A second key without the <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>VITE_</code> prefix (<code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>ANTHROPIC_API_KEY</code>) is reserved for the future server-side full-ingest route in <code style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 5px',fontSize:'10px'}}>api/ingest-om.js</code>.</p>
                </div>

                <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#92400e',marginBottom:4}}>Security — keep this key private</div>
                  <p style={{fontSize:'11px',color:'#92400e',lineHeight:1.55}}>Because the key is included in the browser bundle via <code style={{background:'rgba(0,0,0,.06)',borderRadius:2,padding:'1px 4px',fontSize:'10px'}}>VITE_</code>, anyone who inspects the network traffic or bundle source can read it. For a closed internal tool this is acceptable — but never commit <code style={{background:'rgba(0,0,0,.06)',borderRadius:2,padding:'1px 4px',fontSize:'10px'}}>.env.local</code> to git, and rotate the key immediately if it is ever exposed publicly. Add <code style={{background:'rgba(0,0,0,.06)',borderRadius:2,padding:'1px 4px',fontSize:'10px'}}>.env.local</code> to <code style={{background:'rgba(0,0,0,.06)',borderRadius:2,padding:'1px 4px',fontSize:'10px'}}>.gitignore</code> if it is not there already.</p>
                </div>

              </div>
            </SupportCard>

            {/* 4. PROJECT STATUS & NEXT STEPS */}
            <SupportCard title="Project Status & Next Steps">
              <div style={{display:'flex',flexDirection:'column',gap:14,fontSize:'12px',lineHeight:1.6}}>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>

                  <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                    <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:6}}>Current Phase</div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'var(--text)',marginBottom:4}}>Phase 3 — Preflight Complete</div>
                    <p style={{fontSize:'11px',color:'var(--muted)'}}>Repo A source inspection, field map, API contract, and conflict log are done. Awaiting implementation approval before coding begins.</p>
                  </div>

                  <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                    <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:6}}>Overall Status</div>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {[
                        ['Phase 1 — Planning & base repo setup','done'],
                        ['Phase 2 — Supabase integration (Milestone 1)','done'],
                        ['Phase 3 — Preflight planning','done'],
                        ['Phase 3 — Implementation','pending'],
                      ].map(([label,state]) => (
                        <div key={label} className="flex items-start gap-2">
                          <div style={{
                            width:5,height:5,borderRadius:'50%',flexShrink:0,marginTop:5,
                            background: state==='done' ? '#16a34a' : 'var(--border2)',
                          }}/>
                          <span style={{fontSize:'11px',color: state==='done' ? 'var(--muted)' : 'var(--dim)'}}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:8}}>Recently Completed</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px'}}>
                    {[
                      'Milestone 1 confirmed — add → Supabase → refresh → edit → delete',
                      'Repo A source files inspected in full',
                      'Phase 3 preflight plan produced',
                      'Field map, API contract, and conflict log completed',
                    ].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <div style={{width:5,height:5,borderRadius:'50%',background:'#16a34a',flexShrink:0,marginTop:5}}/>
                        <span style={{fontSize:'11px',color:'var(--muted)'}}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#92400e',marginBottom:8}}>Blockers Before Phase 3 Implementation</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {[
                      'Vercel plan must be confirmed as Pro (300s) — two-agent flow exceeds the 60s Hobby limit',
                      'BLOB_READ_WRITE_TOKEN must be set — PDF upload cannot be tested without it',
                      'User approval of the Phase 3 implementation plan',
                    ].map((item,i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span style={{fontSize:'10px',fontWeight:700,color:'#b45309',flexShrink:0,marginTop:1,minWidth:10}}>!</span>
                        <span style={{fontSize:'11px',color:'#78350f'}}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:8}}>Immediate Next Steps</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {[
                      'Commit current api/ingest-om.js as a preservation checkpoint',
                      'Replace api/ingest-om.js with the Repo A two-agent flow (Reader + Standardizer)',
                      'Update vercel.json — set ingest route maxDuration to 120',
                      'Update fromDbRow in dealMapper.js with additive v2 schema fallbacks',
                      'Update handleIngest — re-fetch from Supabase and auto-open the ingested deal in the edit modal',
                      'Run Phase 3 validation checks — analyst-owned fields blank, raw_data populated, source_files written',
                    ].map((item,i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span style={{fontSize:'9px',fontWeight:700,color:'var(--accent)',flexShrink:0,marginTop:2,minWidth:14}}>{String(i+1).padStart(2,'0')}</span>
                        <span style={{fontSize:'11px',color:'var(--muted)'}}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',justifyContent:'flex-end'}}>
                  <span style={{fontSize:'10px',color:'var(--dim)'}}>Last updated: April 17, 2026</span>
                </div>

              </div>
            </SupportCard>

          </div>
        )}

        {activeTab === 'PIPELINE' && <>

        {/* KPI strip — Tier 2 §2.1 (DESIGN_TOKENS.md). Presentation-safe:
            every tile is computed from current in-memory deal data. The Killed
            tile's subline is a fallback — reason-decomposition requires a
            `pass_reason` field, which is intentionally deferred (see
            BACKLOG.md "Dead Deal Pass Reason Capture"). */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiTile
            label="Active Deals"
            value={kpiStats.activeCount}
            subline="Across all stages except Dead"
          />
          <KpiTile
            label={`Pipeline $`}
            value={kpiStats.activeCount === 0 ? '—' : formatCompactUSD(kpiStats.pipelineTotal)}
            subline={
              kpiStats.activeCount === 0
                ? 'No active deals on file'
                : `${kpiStats.activePriced}/${kpiStats.activeCount} active deals priced`
            }
          />
          <KpiTile
            label={`Added · ${kpiStats.curLabel}`}
            value={kpiStats.addedCur}
            subline={
              kpiStats.addedPrev === 0 && kpiStats.addedCur === 0
                ? 'No adds this month'
                : kpiStats.addedPrev === 0
                ? `First tracked adds since ${kpiStats.prevLabel}`
                : kpiStats.addedCur > kpiStats.addedPrev
                ? `▲ ${kpiStats.addedCur - kpiStats.addedPrev} vs ${kpiStats.prevLabel}`
                : kpiStats.addedCur < kpiStats.addedPrev
                ? `▼ ${kpiStats.addedPrev - kpiStats.addedCur} vs ${kpiStats.prevLabel}`
                : `On pace with ${kpiStats.prevLabel}`
            }
            subTone={
              kpiStats.addedPrev > 0 && kpiStats.addedCur > kpiStats.addedPrev ? 'positive'
              : kpiStats.addedPrev > 0 && kpiStats.addedCur < kpiStats.addedPrev ? 'negative'
              : 'neutral'
            }
          />
          <KpiTile
            label={`Killed · ${kpiStats.curLabel}`}
            value={kpiStats.killedCur}
            subline="Reason capture planned post-v1"
          />
        </div>

        {/* Table card */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',overflow:'hidden',boxShadow:'var(--sh)'}}>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3" style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
            <div className="flex items-center gap-2">
              <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background: deals.length > 0 ? '#16a34a' : 'var(--border2)',transition:'background .3s'}}/>
              <span style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--muted)'}}>Pipeline</span>
              <span style={{fontSize:'11px',color:'var(--dim)'}}>{filtered.length} deal{filtered.length!==1?'s':''}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2" style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'5px',padding:'6px 10px'}}>
                <Search style={{width:12,height:12,color:'var(--dim)',flexShrink:0}}/>
                <input
                  value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search deals…"
                  style={{width:160,background:'transparent',border:'none',outline:'none',fontSize:'12px',color:'var(--text)'}}
                />
              </div>
              <div style={{position:'relative'}}>
                <select
                  value={stageFilter} onChange={e=>setStageFilter(e.target.value)}
                  style={{appearance:'none',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'5px',padding:'6px 28px 6px 10px',fontSize:'11px',color:'var(--muted)',outline:'none',cursor:'pointer'}}
                >
                  <option value="All">All Stages</option>
                  {STAGES.map(s=><option key={s}>{s}</option>)}
                </select>
                <ChevronDown style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',width:12,height:12,color:'var(--dim)',pointerEvents:'none'}}/>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center" style={{padding:'60px 20px'}}>
              <span style={{fontSize:'12px',color:'var(--dim)'}}>Loading pipeline…</span>
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center" style={{padding:'60px 20px'}}>
              <div style={{fontSize:'32px',marginBottom:'8px',opacity:.3}}>◫</div>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--muted)'}}>No deals yet</div>
              <div style={{fontSize:'11px',color:'var(--dim)',marginTop:4}}>Click Add Deal to upload an OM or enter manually</div>
              <button
                onClick={()=>setShowAdd(true)}
                className="inline-flex items-center gap-[5px] mt-5"
                style={{padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer'}}
              >
                <Plus style={{width:13,height:13}}/> Add First Deal
              </button>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:1100}}>
                <thead>
                  <tr>
                    {PIPELINE_COLUMNS.map(col=>(
                      <th key={col.key}
                        className={col.width}
                        style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--dim)',padding:'8px 10px',textAlign:'left',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap',cursor:'pointer',userSelect:'none'}}
                        onClick={()=>handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1" style={sortKey===col.key?{color:'var(--text)'}:{}}>
                          {col.label}
                          <ArrowUpDown style={{width:9,height:9,opacity: sortKey===col.key ? 1 : .35}}/>
                          {sortKey===col.key && <span style={{fontSize:'9px',opacity:.7}}>{sortDir==='asc'?'↑':'↓'}</span>}
                        </span>
                      </th>
                    ))}
                    <th style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--dim)',padding:'8px 10px',textAlign:'left',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(deal=>(
                    <tr key={deal.id} onClick={()=>setEditDeal(deal)}
                      style={{cursor:'pointer'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}
                    >
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis'}}>
                        <div style={{fontWeight:600,fontSize:'12px',color:'var(--text)'}}>{deal.propertyName||'—'}</div>
                        {deal.propertyAddress && <div style={{fontSize:'10px',color:'var(--muted)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis'}}>{deal.propertyAddress}</div>}
                      </td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap'}}>{deal.market||<span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>
                        {deal.assetType
                          ? <span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:3,letterSpacing:'.04em',background:'var(--surface2)',color:'var(--muted)',border:'1px solid var(--border2)'}}>{deal.assetType}</span>
                          : <span style={{color:'var(--dim)'}}>—</span>}
                      </td>
                      {['sf','acreage','yearBuiltRenovated','parkingCount','occupancy','walt'].map(k=>{
                        const display = k === 'walt' ? formatWalt(deal.walt) : deal[k];
                        return (
                          <td key={k} style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>
                            {display || <span style={{color:'var(--dim)'}}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{formatUSD(deal.askingPrice) || <span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{deal.noi||<span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{deal.capRate||<span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{deal.broker||<span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',maxWidth:170,overflow:'hidden',textOverflow:'ellipsis'}}>{deal.keyAnchors||<span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{deal.bidDate||<span style={{color:'var(--dim)'}}>—</span>}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}><StageBadge stage={deal.stage}/></td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'10px',color:'var(--dim)',fontStyle:'italic',maxWidth:170,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{deal.notes||'—'}</td>
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>
                        <button
                          onClick={e=>{e.stopPropagation();setDeleteId(deal.id);}}
                          className="inline-flex items-center"
                          style={{padding:'3px 8px',borderRadius:4,fontSize:'10px',fontWeight:600,cursor:'pointer',border:'1px solid var(--lsg-red-subtle)',background:'transparent',color:'var(--lsg-red)',transition:'all .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--lsg-red-subtle)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        >
                          <Trash2 style={{width:10,height:10}}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </>}
      </main>

      {showAdd && (
        <DealForm
          title="Add New Deal"
          subtitle="Upload OM to auto-fill, then review and save."
          initial={EMPTY_FORM}
          showIngest
          onSave={addDeal}
          onClose={()=>setShowAdd(false)}
          onIngested={handleIngested}
        />
      )}

      {editDeal && (
        <DealForm
          title="Edit Deal"
          initial={editDeal}
          onSave={saveDeal}
          onClose={()=>setEditDeal(null)}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,.45)'}}>
          <div style={{width:'100%',maxWidth:360,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',padding:'20px',boxShadow:'var(--sh-lg)'}}>
            <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:6}}>Delete this deal?</div>
            <div style={{fontSize:'12px',color:'var(--muted)',marginBottom:18}}>This cannot be undone.</div>
            <div className="flex gap-2">
              <button
                onClick={()=>setDeleteId(null)}
                style={{flex:1,padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}
              >Cancel</button>
              <button
                onClick={()=>deleteDeal(deleteId)}
                style={{flex:1,padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--lsg-red)',color:'#fff',border:'none',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--lsg-red-deep)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--lsg-red)'}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
