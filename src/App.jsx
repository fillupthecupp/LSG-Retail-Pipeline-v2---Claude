import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Upload, X, ArrowUpDown,
  Trash2, ChevronDown, AlertCircle, CheckCircle2,
  Save,
} from 'lucide-react';
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

function SupportCard({ title, children, defaultOpen = true }) {
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

function StatCard({ label, value }) {
  return (
    <div className="rounded-[8px] border border-[#e5e3df] bg-[#f4f3f1] px-3 py-[10px]" style={{boxShadow:'var(--sh)'}}>
      <div className="text-[9px] font-bold uppercase tracking-[.08em] text-[#a8a5a1]">{label}</div>
      <div className="mt-[3px] text-[18px] font-bold text-[#1a1917]">{value}</div>
    </div>
  );
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

const FAST_PASS_PROMPT = `You are a senior commercial real estate acquisitions analyst at Lightstone Group.

Read the uploaded offering memorandum PDF and perform a fast pipeline extract — only the fields listed below.

Rules:
- Return ONLY valid JSON — no markdown, no commentary, no code fences
- Return an empty string "" for any field not clearly stated in the document
- Do not guess or infer values not explicitly in the document
- For numbers, return them as strings with their original formatting (e.g. "8.5%", "480,588 SF", "$4,200,000")
- market: city and state only, e.g. "Phoenix, AZ"
- highlights: extract exactly 2–3 short factual bullet points from the OM's investment highlights or executive summary; each string should be one concise sentence; return [] if none found
- missingFields: list the keys of any fields you could not find
- Do NOT extract asking price or cap rate — those are analyst-entered fields

Return exactly this JSON shape:
{
  "propertyName": "",
  "propertyAddress": "",
  "market": "",
  "assetType": "",
  "sf": "",
  "occupancy": "",
  "noi": "",
  "walt": "",
  "broker": "",
  "keyAnchors": "",
  "highlights": [],
  "missingFields": []
}`;

function safeParseJson(text) {
  try { return JSON.parse(text); }
  catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

function DealForm({ initial, title, subtitle, onSave, onClose, showIngest=false }) {
  const [form, setForm] = useState({...EMPTY_FORM, ...initial});
  const [omFile, setOmFile] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestWarn, setIngestWarn] = useState('');
  const [ingestDone, setIngestDone] = useState(false);
  const [missing, setMissing] = useState([]);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  async function handleIngest() {
    if (!omFile) return;
    setIngesting(true); setIngestError(''); setIngestDone(false); setMissing([]);
    try {
      const pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(omFile);
      });

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not configured. Add it to Vercel environment variables.');

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'pdfs-2024-09-25',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: FAST_PASS_PROMPT,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
              { type: 'text', text: `Extract the fast-pass fields from this OM. Filename: ${omFile.name}` },
            ],
          }],
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Anthropic API error (${resp.status})`);
      }

      const data = await resp.json();
      const rawText = data.content?.find(b => b.type === 'text')?.text || '';
      if (!rawText) throw new Error('Anthropic returned an empty response.');

      const ex = safeParseJson(rawText);
      const highlights = Array.isArray(ex.highlights) ? ex.highlights : [];
      setForm(p => ({
        ...p,
        propertyName:    ex.propertyName    || p.propertyName,
        propertyAddress: ex.propertyAddress || p.propertyAddress,
        market:          ex.market          || p.market,
        assetType:       ex.assetType       || p.assetType,
        sf:              ex.sf              || p.sf,
        occupancy:       ex.occupancy       || p.occupancy,
        noi:             ex.noi             || p.noi,
        walt:            ex.walt            || p.walt,
        broker:          ex.broker          || p.broker,
        keyAnchors:      ex.keyAnchors      || p.keyAnchors,
        notes: highlights.length > 0 ? highlights.map(h => `• ${h}`).join('\n') : p.notes,
        stage: 'Screening',
        sourceFiles: [...(p.sourceFiles || []), omFile.name],
        raw_data: { ...(p.raw_data || {}), highlights, ingest_stage: 'fast' },
      }));
      setMissing(Array.isArray(ex.missingFields) ? ex.missingFields : []);
      setIngestDone(true);
    } catch(err) { setIngestError(err?.message || 'Failed to ingest.'); }
    finally { setIngesting(false); }
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
            onMouseEnter={e=>e.currentTarget.style.background='#2d2b28'}
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

  const stats = useMemo(() => ({
    total: deals.length,
    active: deals.filter(d=>d.stage!=='Dead').length,
    bid: deals.filter(d=>d.stage==='Bid').length,
    screening: deals.filter(d=>d.stage==='Screening').length,
  }), [deals]);

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

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)'}}>

      {/* Header */}
      <header style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:40,boxShadow:'var(--sh)'}}>
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4" style={{padding:'0 24px',height:'54px'}}>
          <div className="flex items-center gap-[10px]">
            <div style={{width:30,height:30,background:'var(--accent)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0}}>L</div>
            <div>
              <div style={{fontSize:'15px',fontWeight:600}}>Lightstone</div>
              <div style={{fontSize:'10px',color:'var(--dim)',marginTop:1}}>Retail Pipeline · Acquisitions</div>
            </div>
          </div>
          <button
            onClick={()=>setShowAdd(true)}
            className="inline-flex items-center gap-[5px]"
            style={{padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#2d2b28'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--accent)'}
          >
            <Plus style={{width:13,height:13}}/> Add Deal
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl space-y-5" style={{padding:'20px 24px'}}>

        {/* Tab strip */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',marginBottom:0}}>
          {['PIPELINE','COMPARE','SUPPORT'].map(tab => (
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
            >{tab}</button>
          ))}
        </div>

        {activeTab === 'COMPARE' && <CompareTab deals={deals} />}

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
                    <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:6}}>Current Status</div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'var(--text)',marginBottom:4}}>Refinement / Validation</div>
                    <p style={{fontSize:'11px',color:'var(--muted)'}}>Pipeline foundation is working end-to-end. Current focus is UI polish, fast-pass extraction validation, and workflow refinements before broader use.</p>
                  </div>

                  <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                    <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:6}}>Active Workstream</div>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {['UI polish pass — LSG Deal Ingest visual language','Fast-pass OM extraction (browser → Anthropic)','Tab structure: Pipeline · Compare · Support','Collapsible support cards (this view)'].map(item => (
                        <div key={item} className="flex items-start gap-2">
                          <div style={{width:5,height:5,borderRadius:'50%',background:'#16a34a',flexShrink:0,marginTop:5}}/>
                          <span style={{fontSize:'11px',color:'var(--muted)'}}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:8}}>What Is Working Now</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px'}}>
                    {[
                      'Pipeline table with sort, search, filter',
                      'Manual CRUD (add, edit, delete)',
                      'Supabase persistence',
                      'Fast-pass OM extraction (browser-side)',
                      'Stage badges and deal metadata',
                      'Row-click to edit',
                      'Delete with confirmation',
                      'PIPELINE / COMPARE / SUPPORT tabs',
                    ].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <div style={{width:5,height:5,borderRadius:'50%',background:'#16a34a',flexShrink:0,marginTop:5}}/>
                        <span style={{fontSize:'11px',color:'var(--muted)'}}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:8}}>Immediate Next Steps</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {[
                      ['Test fast-pass extraction with real OMs — validate field population and missing-field handling'],
                      ['Add VITE_ANTHROPIC_API_KEY to Vercel environment variables (Production + Preview)'],
                      ['Validate Supabase persistence round-trip for all field types including raw_data JSONB'],
                      ['Smoke test the full add-deal → extract → review → save → pipeline flow'],
                    ].map(([item],i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span style={{fontSize:'9px',fontWeight:700,color:'var(--accent)',flexShrink:0,marginTop:2,minWidth:14}}>{String(i+1).padStart(2,'0')}</span>
                        <span style={{fontSize:'11px',color:'var(--muted)'}}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'5px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--dim)',marginBottom:8}}>Deferred / Later</div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {[
                      'Full ingest (Stage 2) — server-side PDF → Anthropic via api/ingest-om.js, enriching raw_data beyond fast-pass fields',
                      'Compare flow — side-by-side deal comparison (tab placeholder exists)',
                      'Screener — deal screening against hurdle rates (hurdle config shown above)',
                      'One-pager generation — IC-ready deal summary export',
                      'Auth / access control — Supabase RLS with team login',
                    ].map((item,i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div style={{width:5,height:5,borderRadius:'50%',background:'var(--border2)',flexShrink:0,marginTop:5}}/>
                        <span style={{fontSize:'11px',color:'var(--dim)'}}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',justifyContent:'flex-end'}}>
                  <span style={{fontSize:'10px',color:'var(--dim)'}}>Last updated: April 16, 2026</span>
                </div>

              </div>
            </SupportCard>

          </div>
        )}

        {activeTab === 'PIPELINE' && <>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Deals" value={stats.total}/>
          <StatCard label="Active"       value={stats.active}/>
          <StatCard label="At Bid"       value={stats.bid}/>
          <StatCard label="Screening"    value={stats.screening}/>
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
                      {['sf','acreage','yearBuiltRenovated','parkingCount','occupancy','walt'].map(k=>(
                        <td key={k} style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>
                          {deal[k]||<span style={{color:'var(--dim)'}}>—</span>}
                        </td>
                      ))}
                      <td style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'11px',fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{deal.askingPrice||<span style={{color:'var(--dim)'}}>—</span>}</td>
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
                          style={{padding:'3px 8px',borderRadius:4,fontSize:'10px',fontWeight:600,cursor:'pointer',border:'1px solid #fecaca',background:'transparent',color:'#dc2626',transition:'all .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
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
                style={{flex:1,padding:'7px 13px',borderRadius:'5px',fontSize:'12px',fontWeight:500,background:'#dc2626',color:'#fff',border:'none',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='#b91c1c'}
                onMouseLeave={e=>e.currentTarget.style.background='#dc2626'}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
