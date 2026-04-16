import React, { useEffect, useMemo, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  Building2, Search, Plus, Upload, X, ArrowUpDown,
  Trash2, ChevronDown, AlertCircle, CheckCircle2,
  Pencil, Save,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { fromDbRow, toDbRow } from './lib/dealMapper';

const STAGES = ['Screening', 'Underwriting', 'Bid', 'Active', 'Dead'];
const STAGE_COLORS = {
  Screening:    'bg-blue-50 text-blue-700 border-blue-200',
  Underwriting: 'bg-amber-50 text-amber-700 border-amber-200',
  Bid:          'bg-yellow-50 text-yellow-700 border-yellow-200',
  Active:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dead:         'bg-zinc-100 text-zinc-500 border-zinc-200',
};
const ASSET_TYPES = ['Power Center','Strip Center','Grocery-Anchored','Super-Regional Mall','Regional Mall','Neighborhood Center','Net Lease','Other'];
const PIPELINE_COLUMNS = [
  { key: 'propertyName',       label: 'Property',       width: 'min-w-[180px]' },
  { key: 'propertyAddress',    label: 'Address',        width: 'min-w-[200px]' },
  { key: 'market',             label: 'Market',         width: 'min-w-[130px]' },
  { key: 'assetType',          label: 'Type',           width: 'min-w-[140px]' },
  { key: 'sf',                 label: 'GLA (SF)',       width: 'min-w-[100px]' },
  { key: 'acreage',            label: 'Acreage',        width: 'min-w-[85px]'  },
  { key: 'yearBuiltRenovated', label: 'Year Built',     width: 'min-w-[105px]' },
  { key: 'parkingCount',       label: 'Parking',        width: 'min-w-[85px]'  },
  { key: 'occupancy',          label: 'Occupancy',      width: 'min-w-[95px]'  },
  { key: 'walt',               label: 'WALT',           width: 'min-w-[75px]'  },
  { key: 'askingPrice',        label: 'Purchase Price',      width: 'min-w-[140px]' },
  { key: 'noi',                label: 'NOI',                 width: 'min-w-[115px]' },
  { key: 'capRate',            label: 'Going-In Cap',        width: 'min-w-[115px]' },
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
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STAGE_COLORS[stage]||STAGE_COLORS.Screening)}>
      {stage}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function FF({ label, value, onChange, placeholder, type='text', multiline=false, children }) {
  const base = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100';
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</div>
      {children ? children : multiline
        ? <textarea className={cn(base,'min-h-[80px] resize-y')} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
        : <input className={base} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
      }
    </label>
  );
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
      const blob = await upload(omFile.name, omFile, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
      });
      const resp = await fetch('/api/ingest-om', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ filename: omFile.name, url: blob.url }),
      });

      if (resp.status === 413) {
        throw new Error('File is too large for the server (413). Please use a PDF under 15 MB or compress it first.');
      }

      // Guard against HTML error pages (e.g. 404 when API route not found)
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await resp.text();
        throw new Error(`API route returned non-JSON (${resp.status}): ${text.slice(0, 200)}`);
      }

      const json = await resp.json();
      if (!resp.ok || !json?.ok) throw new Error(json?.error || json?.details || 'Ingestion failed.');
      const ex = json.extracted || {};
      setForm(p => ({
        ...p,
        propertyName:       ex.propertyName       || p.propertyName,
        propertyAddress:    ex.propertyAddress     || p.propertyAddress,
        market:             ex.market              || p.market,
        assetType:          ex.assetType           || p.assetType,
        sf:                 ex.sf                  || p.sf,
        acreage:            ex.acreage             || p.acreage,
        yearBuiltRenovated: ex.yearBuiltRenovated  || p.yearBuiltRenovated,
        parkingCount:       ex.parkingCount        || p.parkingCount,
        occupancy:          ex.occupancy           || p.occupancy,
        walt:               ex.walt                || p.walt,
        // askingPrice (Purchase Price) intentionally excluded — analyst-entered, not auto-filled
        noi:                ex.noi                 || p.noi,
        // capRate (Going-In Cap Rate) intentionally excluded — analyst-entered, not auto-filled
        broker:             ex.broker              || p.broker,
        keyAnchors:         ex.keyAnchors          || p.keyAnchors,
        // Record the uploaded filename so it is saved to source_files on submit
        sourceFiles:        [...(p.sourceFiles || []), omFile.name],
      }));
      setMissing(Array.isArray(ex.missingFields) ? ex.missingFields : []);
      setIngestDone(true);
    } catch(err) { setIngestError(err?.message||'Failed to ingest.'); }
    finally { setIngesting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 flex-shrink-0">
          <div>
            <div className="text-lg font-semibold text-zinc-900">{title}</div>
            {subtitle && <div className="mt-0.5 text-sm text-zinc-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5"/></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {showIngest && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">OM Upload — AI Extract (optional)</div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                  <Upload className="h-4 w-4"/>
                  Choose PDF
                  <input type="file" accept=".pdf" className="hidden" onChange={e=>{
                    const file = e.target.files?.[0];
                    setIngestDone(false); setIngestError(''); setIngestWarn('');
                    if (file) {
                      if (file.size > 50 * 1024 * 1024) { // 50 MB hard limit
                        setIngestError('File is too large (over 50 MB). Please choose a smaller PDF or compress it.');
                        setOmFile(null);
                      } else {
                        setOmFile(file);
                        if (file.size > 25 * 1024 * 1024) {
                          setIngestWarn('Large file — extraction may be slow.');
                        }
                      }
                    } else {
                      setOmFile(null);
                    }
                  }}/>
                </label>
                {omFile && (
                  <span className="text-sm text-zinc-600 truncate max-w-[180px]">
                    {omFile.name}
                    <span className="ml-1 text-zinc-400 font-normal">({(omFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </span>
                )}
                <button
                  onClick={handleIngest}
                  disabled={!omFile||ingesting}
                  className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition',
                    !omFile||ingesting ? 'cursor-not-allowed bg-zinc-300' : 'bg-zinc-900 hover:bg-zinc-700'
                  )}
                >
                  {ingesting
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Extracting...</>
                    : <>Extract with AI</>
                  }
                </button>
              </div>
              {ingestError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0"/>{ingestError}
                </div>
              )}
              {ingestWarn && !ingestError && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0"/>{ingestWarn}
                </div>
              )}
              {ingestDone && !ingestError && (
                <div className="flex flex-wrap items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0"/>
                  <span>Fields extracted. Review below and fill any gaps.{missing.length > 0 && <span className="ml-1 text-amber-700">Missing: {missing.join(', ')}</span>}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FF label="Property Name" value={form.propertyName} onChange={v=>set('propertyName',v)} placeholder="Promenade at Casa Grande"/>
            <FF label="Property Address" value={form.propertyAddress} onChange={v=>set('propertyAddress',v)} placeholder="1005 N Promenade Pkwy, Casa Grande, AZ"/>
            <FF label="Market" value={form.market} onChange={v=>set('market',v)} placeholder="Phoenix, AZ"/>
            <FF label="Asset Type" value={form.assetType} onChange={v=>set('assetType',v)}>
              <select className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400" value={form.assetType} onChange={e=>set('assetType',e.target.value)}>
                <option value="">Select type...</option>
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
              <select className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400" value={form.stage} onChange={e=>set('stage',e.target.value)}>
                {STAGES.map(s=><option key={s}>{s}</option>)}
              </select>
            </FF>
          </div>
          <FF label="Notes" value={form.notes} onChange={v=>set('notes',v)} placeholder="IC thesis, open items, sourcing context..." multiline/>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4 flex-shrink-0">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancel</button>
          <button onClick={()=>onSave(form)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
            <Save className="h-4 w-4"/> Save Deal
          </button>
        </div>
      </div>
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Building2 className="h-5 w-5"/>
            </div>
            <div>
              <div className="text-base font-semibold">LSG Retail Pipeline</div>
              <div className="text-xs text-zinc-500">Lightstone Group · Acquisitions</div>
            </div>
          </div>
          <button onClick={()=>setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 transition">
            <Plus className="h-4 w-4"/> Add Deal
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl space-y-6 px-6 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Deals"  value={stats.total}/>
          <StatCard label="Active"        value={stats.active}/>
          <StatCard label="At Bid"        value={stats.bid}/>
          <StatCard label="Screening"     value={stats.screening}/>
        </div>

        {/* Table card */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-900">
              Pipeline
              <span className="ml-2 text-sm font-normal text-zinc-400">{filtered.length} deal{filtered.length!==1?'s':''}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search deals..."
                  className="w-44 bg-transparent text-sm outline-none placeholder:text-zinc-400"/>
              </div>
              <div className="relative">
                <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-8 py-2 text-sm text-zinc-700 outline-none cursor-pointer focus:border-zinc-400">
                  <option value="All">All Stages</option>
                  {STAGES.map(s=><option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"/>
              </div>
            </div>
          </div>

          {/* Loading / empty / table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-sm text-zinc-400">Loading pipeline…</span>
            </div>
          ) : deals.length===0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-5xl opacity-20">◫</div>
              <div className="text-base font-medium text-zinc-500">No deals yet</div>
              <div className="mt-1 text-sm text-zinc-400">Click Add Deal to upload an OM or enter manually</div>
              <button onClick={()=>setShowAdd(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                <Plus className="h-4 w-4"/> Add First Deal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-widest text-zinc-400">
                  <tr>
                    {PIPELINE_COLUMNS.map(col=>(
                      <th key={col.key} className={cn('px-4 py-3 whitespace-nowrap', col.width)}>
                        <button onClick={()=>handleSort(col.key)} className="inline-flex items-center gap-1 hover:text-zinc-600 transition">
                          {col.label}
                          <ArrowUpDown className={cn('h-3 w-3', sortKey===col.key?'text-zinc-700':'text-zinc-300')}/>
                          {sortKey===col.key && <span className="text-[10px] text-zinc-500">{sortDir==='asc'?'↑':'↓'}</span>}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 whitespace-nowrap text-xs font-medium uppercase tracking-widest text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map(deal=>(
                    <tr key={deal.id} className="hover:bg-zinc-50 transition group">
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap max-w-[180px] truncate">{deal.propertyName||deal.propertyAddress||'—'}</td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate whitespace-nowrap">{deal.propertyAddress||'—'}</td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{deal.market||'—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deal.assetType
                          ? <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-600">{deal.assetType}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.sf||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.acreage||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.yearBuiltRenovated||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.parkingCount||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.occupancy||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.walt||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-zinc-800 whitespace-nowrap">{deal.askingPrice||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.noi||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.capRate||'—'}</td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[150px] truncate whitespace-nowrap">{deal.broker||'—'}</td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[170px] truncate whitespace-nowrap">{deal.keyAnchors||'—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.bidDate||'—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StageBadge stage={deal.stage}/></td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[170px] truncate italic text-xs">{deal.notes||'—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={()=>setEditDeal(deal)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                            <Pencil className="h-3 w-3"/> Edit
                          </button>
                          <button onClick={()=>setDeleteId(deal.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3 w-3"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showAdd && (
        <DealForm
          title="Add New Deal"
          subtitle="Enter deal details below and save."
          initial={EMPTY_FORM}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="text-base font-semibold text-zinc-900 mb-2">Delete this deal?</div>
            <div className="text-sm text-zinc-500 mb-5">This cannot be undone.</div>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancel</button>
              <button onClick={()=>deleteDeal(deleteId)} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
