import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2, Search, Plus, Upload, X, ArrowUpDown,
  Trash2, ChevronDown, AlertCircle, CheckCircle2,
  Pencil, Save, XCircle,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lsg-pipeline-v1';

const STAGES = ['Screening', 'Underwriting', 'Bid', 'Active', 'Dead'];

const STAGE_COLORS = {
  Screening: 'bg-blue-50 text-blue-700 border-blue-200',
  Underwriting: 'bg-amber-50 text-amber-700 border-amber-200',
  Bid: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dead: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const ASSET_TYPES = [
  'Power Center',
  'Strip Center',
  'Grocery-Anchored',
  'Super-Regional Mall',
  'Regional Mall',
  'Neighborhood Center',
  'Net Lease',
  'Other',
];

const PIPELINE_COLUMNS = [
  { key: 'propertyName',        label: 'Property',            width: 'min-w-[200px]' },
  { key: 'propertyAddress',     label: 'Address',             width: 'min-w-[200px]' },
  { key: 'market',              label: 'Market',              width: 'min-w-[140px]' },
  { key: 'assetType',           label: 'Type',                width: 'min-w-[140px]' },
  { key: 'sf',                  label: 'GLA (SF)',            width: 'min-w-[110px]' },
  { key: 'acreage',             label: 'Acreage',             width: 'min-w-[90px]'  },
  { key: 'yearBuiltRenovated',  label: 'Year Built',          width: 'min-w-[110px]' },
  { key: 'parkingCount',        label: 'Parking',             width: 'min-w-[90px]'  },
  { key: 'occupancy',           label: 'Occupancy',           width: 'min-w-[100px]' },
  { key: 'walt',                label: 'WALT',                width: 'min-w-[80px]'  },
  { key: 'askingPrice',         label: 'Asking Price',        width: 'min-w-[130px]' },
  { key: 'noi',                 label: 'NOI',                 width: 'min-w-[120px]' },
  { key: 'capRate',             label: 'Cap Rate',            width: 'min-w-[100px]' },
  { key: 'broker',              label: 'Broker',              width: 'min-w-[160px]' },
  { key: 'keyAnchors',          label: 'Key Anchors',         width: 'min-w-[180px]' },
  { key: 'bidDate',             label: 'Bid Date',            width: 'min-w-[110px]' },
  { key: 'stage',               label: 'Stage',               width: 'min-w-[120px]' },
  { key: 'notes',               label: 'Notes',               width: 'min-w-[180px]' },
];

const EMPTY_FORM = {
  propertyName: '',
  propertyAddress: '',
  market: '',
  assetType: '',
  sf: '',
  acreage: '',
  yearBuiltRenovated: '',
  parkingCount: '',
  occupancy: '',
  walt: '',
  askingPrice: '',
  noi: '',
  capRate: '',
  broker: '',
  keyAnchors: '',
  bidDate: '',
  stage: 'Screening',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseSortable(val) {
  if (val == null) return '';
  const s = String(val).trim();
  const n = Number(s.replace(/[$,%\s]/g, '').replace(/,/g, ''));
  return !Number.isNaN(n) && /\d/.test(s) ? n : s.toLowerCase();
}

function getSortValue(deal, key) {
  if (key === 'stage') return STAGES.indexOf(deal.stage) ?? 99;
  return parseSortable(deal[key]);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      STAGE_COLORS[stage] || STAGE_COLORS.Screening
    )}>
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

function FormField({ label, value, onChange, placeholder, type = 'text', multiline = false, children }) {
  const base = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100';
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</div>
      {children ? children : multiline ? (
        <textarea className={cn(base, 'min-h-[80px] resize-y')} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={base} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

// ─── Ingest Modal ─────────────────────────────────────────────────────────────

function IngestModal({ onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [omFile, setOmFile] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [missingFields, setMissingFields] = useState([]);
  const [ingestDone, setIngestDone] = useState(false);

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleIngest() {
    if (!omFile) return;
    setIngesting(true);
    setIngestError('');
    setMissingFields([]);
    setIngestDone(false);

    try {
      const dataBase64 = await fileToBase64(omFile);
      const resp = await fetch('/api/ingest-om', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: omFile.name, dataBase64 }),
      });

      const json = await resp.json();
      if (!resp.ok || !json?.ok) throw new Error(json?.error || 'Ingestion failed.');

      const ex = json.extracted || {};
      setForm(prev => ({
        ...prev,
        propertyName:       ex.propertyName       || prev.propertyName,
        propertyAddress:    ex.propertyAddress     || prev.propertyAddress,
        market:             ex.market              || prev.market,
        assetType:          ex.assetType           || prev.assetType,
        sf:                 ex.sf                  || prev.sf,
        acreage:            ex.acreage             || prev.acreage,
        yearBuiltRenovated: ex.yearBuiltRenovated  || prev.yearBuiltRenovated,
        parkingCount:       ex.parkingCount        || prev.parkingCount,
        occupancy:          ex.occupancy           || prev.occupancy,
        walt:               ex.walt                || prev.walt,
        askingPrice:        ex.askingPrice         || prev.askingPrice,
        noi:                ex.noi                 || prev.noi,
        capRate:            ex.capRate             || prev.capRate,
        broker:             ex.broker              || prev.broker,
        keyAnchors:         ex.keyAnchors          || prev.keyAnchors,
      }));

      setMissingFields(Array.isArray(ex.missingFields) ? ex.missingFields : []);
      setIngestDone(true);
    } catch (err) {
      setIngestError(err?.message || 'Failed to ingest OM.');
    } finally {
      setIngesting(false);
    }
  }

  function handleSave() {
    const deal = {
      id: Date.now(),
      ...form,
      dateAdded: new Date().toISOString().slice(0, 10),
      omFileName: omFile?.name || null,
    };
    onSave(deal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 flex-shrink-0">
          <div>
            <div className="text-lg font-semibold text-zinc-900">Add New Deal</div>
            <div className="mt-0.5 text-sm text-zinc-500">Upload OM to auto-fill, then review and save.</div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* OM Upload */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">OM Upload (optional)</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                <Upload className="h-4 w-4" />
                Choose PDF
                <input type="file" accept=".pdf" className="hidden" onChange={e => {
                  setOmFile(e.target.files?.[0] || null);
                  setIngestError('');
                  setMissingFields([]);
                  setIngestDone(false);
                }} />
              </label>
              {omFile && (
                <span className="text-sm text-zinc-600 truncate max-w-[200px]">{omFile.name}</span>
              )}
              <button
                onClick={handleIngest}
                disabled={!omFile || ingesting}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition',
                  !omFile || ingesting ? 'cursor-not-allowed bg-zinc-300' : 'bg-zinc-900 hover:bg-zinc-700'
                )}
              >
                {ingesting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Extracting...
                  </>
                ) : (
                  <>Extract with AI</>
                )}
              </button>
            </div>

            {ingestError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {ingestError}
              </div>
            )}

            {ingestDone && !ingestError && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                Fields extracted. Review below and fill any gaps.
                {missingFields.length > 0 && (
                  <span className="text-amber-700 ml-1">Missing: {missingFields.join(', ')}</span>
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Property Name" value={form.propertyName} onChange={v => setField('propertyName', v)} placeholder="Promenade at Casa Grande" />
            <FormField label="Property Address" value={form.propertyAddress} onChange={v => setField('propertyAddress', v)} placeholder="1005 N Promenade Pkwy, Casa Grande, AZ" />
            <FormField label="Market" value={form.market} onChange={v => setField('market', v)} placeholder="Phoenix, AZ" />
            <FormField label="Asset Type" value={form.assetType} onChange={v => setField('assetType', v)}>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                value={form.assetType}
                onChange={e => setField('assetType', e.target.value)}
              >
                <option value="">Select type...</option>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="GLA (SF)" value={form.sf} onChange={v => setField('sf', v)} placeholder="480,588" />
            <FormField label="Acreage" value={form.acreage} onChange={v => setField('acreage', v)} placeholder="71.64" />
            <FormField label="Year Built / Renovated" value={form.yearBuiltRenovated} onChange={v => setField('yearBuiltRenovated', v)} placeholder="2007" />
            <FormField label="Parking Count" value={form.parkingCount} onChange={v => setField('parkingCount', v)} placeholder="3,335" />
            <FormField label="Occupancy (%)" value={form.occupancy} onChange={v => setField('occupancy', v)} placeholder="85.7%" />
            <FormField label="WALT (yrs)" value={form.walt} onChange={v => setField('walt', v)} placeholder="6.34" />
            <FormField label="Asking Price" value={form.askingPrice} onChange={v => setField('askingPrice', v)} placeholder="$65,000,000 or Best Offer" />
            <FormField label="NOI" value={form.noi} onChange={v => setField('noi', v)} placeholder="$4,592,150" />
            <FormField label="Cap Rate (%)" value={form.capRate} onChange={v => setField('capRate', v)} placeholder="7.07%" />
            <FormField label="Broker / Source" value={form.broker} onChange={v => setField('broker', v)} placeholder="Colliers — El Warner" />
            <FormField label="Key Anchors" value={form.keyAnchors} onChange={v => setField('keyAnchors', v)} placeholder="Ross, Marshalls, HomeGoods" />
            <FormField label="Bid Date" value={form.bidDate} onChange={v => setField('bidDate', v)} type="date" />
            <FormField label="Stage" value={form.stage} onChange={v => setField('stage', v)}>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                value={form.stage}
                onChange={e => setField('stage', e.target.value)}
              >
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Notes" value={form.notes} onChange={v => setField('notes', v)} placeholder="IC thesis, open items, sourcing context..." multiline />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4 flex-shrink-0">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4" />
            Save Deal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Row Modal ───────────────────────────────────────────────────────────

function EditModal({ deal, onClose, onSave }) {
  const [form, setForm] = useState({ ...deal });

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 flex-shrink-0">
          <div className="text-lg font-semibold text-zinc-900">Edit Deal</div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Property Name" value={form.propertyName || ''} onChange={v => setField('propertyName', v)} />
            <FormField label="Property Address" value={form.propertyAddress || ''} onChange={v => setField('propertyAddress', v)} />
            <FormField label="Market" value={form.market || ''} onChange={v => setField('market', v)} />
            <FormField label="Asset Type" value={form.assetType || ''} onChange={v => setField('assetType', v)}>
              <select className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none" value={form.assetType || ''} onChange={e => setField('assetType', e.target.value)}>
                <option value="">Select type...</option>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="GLA (SF)" value={form.sf || ''} onChange={v => setField('sf', v)} />
            <FormField label="Acreage" value={form.acreage || ''} onChange={v => setField('acreage', v)} />
            <FormField label="Year Built / Renovated" value={form.yearBuiltRenovated || ''} onChange={v => setField('yearBuiltRenovated', v)} />
            <FormField label="Parking Count" value={form.parkingCount || ''} onChange={v => setField('parkingCount', v)} />
            <FormField label="Occupancy" value={form.occupancy || ''} onChange={v => setField('occupancy', v)} />
            <FormField label="WALT" value={form.walt || ''} onChange={v => setField('walt', v)} />
            <FormField label="Asking Price" value={form.askingPrice || ''} onChange={v => setField('askingPrice', v)} />
            <FormField label="NOI" value={form.noi || ''} onChange={v => setField('noi', v)} />
            <FormField label="Cap Rate" value={form.capRate || ''} onChange={v => setField('capRate', v)} />
            <FormField label="Broker / Source" value={form.broker || ''} onChange={v => setField('broker', v)} />
            <FormField label="Key Anchors" value={form.keyAnchors || ''} onChange={v => setField('keyAnchors', v)} />
            <FormField label="Bid Date" value={form.bidDate || ''} onChange={v => setField('bidDate', v)} type="date" />
            <FormField label="Stage" value={form.stage || 'Screening'} onChange={v => setField('stage', v)}>
              <select className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none" value={form.stage || 'Screening'} onChange={e => setField('stage', e.target.value)}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Notes" value={form.notes || ''} onChange={v => setField('notes', v)} multiline />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 flex-shrink-0">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [deals, setDeals] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [sortKey, setSortKey] = useState('dateAdded');
  const [sortDir, setSortDir] = useState('desc');
  const [showIngest, setShowIngest] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deals)); } catch {}
  }, [deals]);

  // Stats
  const stats = useMemo(() => ({
    total: deals.length,
    active: deals.filter(d => d.stage !== 'Dead').length,
    bid: deals.filter(d => d.stage === 'Bid').length,
    screening: deals.filter(d => d.stage === 'Screening').length,
  }), [deals]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = deals.filter(d => {
      const text = [d.propertyName, d.propertyAddress, d.market, d.assetType, d.stage, d.broker, d.keyAnchors]
        .join(' ').toLowerCase();
      return (!q || text.includes(q)) && (stageFilter === 'All' || d.stage === stageFilter);
    });
    out = [...out].sort((a, b) => {
      const av = getSortValue(a, sortKey), bv = getSortValue(b, sortKey);
      if (av === bv) return 0;
      const r = av > bv ? 1 : -1;
      return sortDir === 'asc' ? r : -r;
    });
    return out;
  }, [deals, search, stageFilter, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function addDeal(deal) {
    setDeals(prev => [deal, ...prev]);
  }

  function saveDeal(updated) {
    setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
  }

  function deleteDeal(id) {
    setDeals(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">LSG Retail Pipeline</div>
              <div className="text-xs text-zinc-500">Lightstone Group · Acquisitions</div>
            </div>
          </div>
          <button
            onClick={() => setShowIngest(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Deal
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Deals" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="At Bid" value={stats.bid} />
          <StatCard label="Screening" value={stats.screening} />
        </div>

        {/* Pipeline Table Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">

          {/* Table toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-900">
              Pipeline
              <span className="ml-2 text-sm font-normal text-zinc-400">{filtered.length} deal{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <Search className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search deals..."
                  className="w-48 bg-transparent outline-none placeholder:text-zinc-400 text-sm"
                />
              </div>
              {/* Stage filter */}
              <div className="relative">
                <select
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-8 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400 cursor-pointer"
                >
                  <option value="All">All Stages</option>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Table */}
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-5xl opacity-20">◫</div>
              <div className="text-base font-medium text-zinc-500">No deals yet</div>
              <div className="mt-1 text-sm text-zinc-400">Click Add Deal to upload an OM or enter manually</div>
              <button onClick={() => setShowIngest(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                <Plus className="h-4 w-4" /> Add First Deal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-widest text-zinc-400">
                  <tr>
                    {PIPELINE_COLUMNS.map(col => (
                      <th key={col.key} className={cn('px-4 py-3 whitespace-nowrap', col.width)}>
                        <button
                          onClick={() => handleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-zinc-600 transition"
                        >
                          {col.label}
                          <ArrowUpDown className={cn('h-3 w-3', sortKey === col.key ? 'text-zinc-700' : 'text-zinc-300')} />
                          {sortKey === col.key && (
                            <span className="text-[10px] text-zinc-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 whitespace-nowrap text-xs font-medium uppercase tracking-widest text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map(deal => (
                    <tr key={deal.id} className="hover:bg-zinc-50 transition group">
                      {/* Property name */}
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap max-w-[200px] truncate">
                        {deal.propertyName || deal.propertyAddress || '—'}
                      </td>
                      {/* Address */}
                      <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate whitespace-nowrap">
                        {deal.propertyAddress || '—'}
                      </td>
                      {/* Market */}
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{deal.market || '—'}</td>
                      {/* Asset Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deal.assetType ? (
                          <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-600">
                            {deal.assetType}
                          </span>
                        ) : '—'}
                      </td>
                      {/* SF */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.sf || '—'}</td>
                      {/* Acreage */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.acreage || '—'}</td>
                      {/* Year Built */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.yearBuiltRenovated || '—'}</td>
                      {/* Parking */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.parkingCount || '—'}</td>
                      {/* Occupancy */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.occupancy || '—'}</td>
                      {/* WALT */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.walt || '—'}</td>
                      {/* Asking Price */}
                      <td className="px-4 py-3 font-mono text-sm font-medium text-zinc-800 whitespace-nowrap">{deal.askingPrice || '—'}</td>
                      {/* NOI */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.noi || '—'}</td>
                      {/* Cap Rate */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.capRate || '—'}</td>
                      {/* Broker */}
                      <td className="px-4 py-3 text-zinc-600 max-w-[160px] truncate whitespace-nowrap">{deal.broker || '—'}</td>
                      {/* Key Anchors */}
                      <td className="px-4 py-3 text-zinc-600 max-w-[180px] truncate whitespace-nowrap">{deal.keyAnchors || '—'}</td>
                      {/* Bid Date */}
                      <td className="px-4 py-3 font-mono text-sm text-zinc-600 whitespace-nowrap">{deal.bidDate || '—'}</td>
                      {/* Stage */}
                      <td className="px-4 py-3 whitespace-nowrap"><StageBadge stage={deal.stage} /></td>
                      {/* Notes */}
                      <td className="px-4 py-3 text-zinc-500 max-w-[180px] truncate italic text-xs">{deal.notes || '—'}</td>
                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => setEditingDeal(deal)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(deal.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* Modals */}
      {showIngest && <IngestModal onClose={() => setShowIngest(false)} onSave={addDeal} />}
      {editingDeal && <EditModal deal={editingDeal} onClose={() => setEditingDeal(null)} onSave={saveDeal} />}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="text-base font-semibold text-zinc-900 mb-2">Delete this deal?</div>
            <div className="text-sm text-zinc-500 mb-5">This cannot be undone.</div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancel</button>
              <button onClick={() => deleteDeal(confirmDeleteId)} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
