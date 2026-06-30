import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export interface Split {
  id:          string;
  role:        string;
  label:       string;
  percentage:  number;
}

const ROLES = ['artist', 'platform', 'producer', 'songwriter', 'choir', 'featured_artist'];

const inputCls = "bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40";

export default function RoyaltySplitEditor({
  splits,
  onChange,
}: {
  splits:   Split[];
  onChange: (s: Split[]) => void;
}) {
  const total = splits.reduce((s, r) => s + r.percentage, 0);
  const valid = Math.abs(total - 100) < 0.01;

  const addRow = () => {
    onChange([...splits, {
      id:         crypto.randomUUID(),
      role:       'producer',
      label:      '',
      percentage: 0,
    }]);
  };

  const removeRow = (id: string) => onChange(splits.filter(s => s.id !== id));

  const update = (id: string, field: keyof Split, value: string | number) => {
    onChange(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Royalty Splits</h4>
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${valid ? 'text-[#00F5A0] bg-[#00F5A0]/10' : 'text-red-400 bg-red-500/10'}`}>
          {total.toFixed(0)}% / 100%
        </div>
      </div>

      {splits.map(s => (
        <div key={s.id} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-center">
          <select
            value={s.role}
            onChange={e => update(s.id, 'role', e.target.value)}
            className={inputCls + ' capitalize'}
          >
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <input
            type="text"
            value={s.label}
            onChange={e => update(s.id, 'label', e.target.value)}
            placeholder="Name / Wallet"
            className={inputCls}
          />
          <div className="relative">
            <input
              type="number"
              value={s.percentage}
              onChange={e => update(s.id, 'percentage', parseFloat(e.target.value) || 0)}
              min={0} max={100} step={0.5}
              className={inputCls + ' pr-6 w-full'}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
          </div>
          <button
            type="button"
            onClick={() => removeRow(s.id)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {!valid && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Total must equal 100%. Currently {total.toFixed(1)}%.
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 text-xs text-[#00D9FF] hover:text-[#00D9FF]/80 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Collaborator
      </button>
    </div>
  );
}
