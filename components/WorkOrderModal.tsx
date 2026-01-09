import React, { useState } from 'react';
import { WorkOrder, InvoiceItem } from '../types';
import { Trash2 } from 'lucide-react';
import { toDisplayDate, toInputDate, getTodayInput } from '../utils/formatters';

interface WorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (wo: WorkOrder) => void;
  initial?: WorkOrder | null;
}

type LocalRow = {
  id: string;
  description: string;
  uom: string;
  qty: string; // kept as string to allow empty input without forcing 0
  rate: string; // kept as string to avoid leading-zero/auto-0 issues
};

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({ open, onClose, onSave, initial = null }) => {
  const [number, setNumber] = useState(initial?.number || '');
  const [date, setDate] = useState(initial?.date || getTodayInput());
  const [items, setItems] = useState<LocalRow[]>(initial?.items?.length ? initial.items.map(i => ({ id: i.id?.toString() || `local-${Date.now().toString()}`, description: i.description || '', uom: i.uom || '', qty: String(i.qty || ''), rate: String(i.rate || '') })) : []);

  React.useEffect(() => {
    if (initial) {
      setNumber(initial.number || '');
      setDate(initial.date || getTodayInput());
      setItems(initial.items && initial.items.length ? initial.items.map(i => ({ id: i.id?.toString() || `local-${Date.now().toString()}`, description: i.description || '', uom: i.uom || '', qty: String(i.qty || ''), rate: String(i.rate || '') })) : []);
    } else {
      setNumber('');
      setDate(getTodayInput());
      setItems([]);
    }
  }, [initial, open]);

  const addRow = () => setItems(prev => [...prev, { id: `local-${Date.now().toString()}`, description: '', uom: '', qty: '', rate: '' }]);
  const removeRow = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateRow = (id: string, updates: Partial<LocalRow>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } as LocalRow : i));

  const save = () => {
    // Convert LocalRow to InvoiceItem with numeric qty/rate
    const convItems: InvoiceItem[] = items.map(i => ({ id: i.id, description: i.description, uom: i.uom, qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 }));
    const wo: WorkOrder = {
      id: initial?.id || Date.now().toString(),
      number,
      date,
      items: convItems
    };
    onSave(wo);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-2xl border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold uppercase">{initial ? 'Edit Work Order' : 'Add Work Order'}</h3>
          <button onClick={onClose} className="text-sm font-bold">Close</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Work Order #</label>
            <input value={number} onChange={e => setNumber(e.target.value)} className="w-full px-3 py-2 border-2 border-black" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black" 
            />
          </div>
        </div>

        <div className="mb-4">
          <div className={`flex items-center mb-2 ${items.length === 0 ? 'justify-center' : 'justify-between'}`}>
            {items.length > 0 && <div className="font-bold uppercase text-[10px]">Scope of Work</div>}
            <button onClick={addRow} className="bg-black text-white px-3 py-1 font-bold uppercase text-xs">Add Row</button>
          </div>

          {items.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-bold">
                  <th className="p-2 border">Description</th>
                  <th className="p-2 border">UoM</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Rate</th>
                  <th className="p-2 border">Amount</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr key={row.id}>
                    <td className="p-2 border"><input className="w-full px-2" value={row.description} onChange={e => updateRow(row.id, { description: e.target.value })} /></td>
                    <td className="p-2 border"><input className="w-full px-2" value={row.uom} onChange={e => updateRow(row.id, { uom: e.target.value })} /></td>
                    <td className="p-2 border"><input inputMode="numeric" className="w-full px-2" value={row.qty} onChange={e => updateRow(row.id, { qty: e.target.value })} /></td>
                    <td className="p-2 border"><input inputMode="decimal" className="w-full px-2" value={row.rate} onChange={e => updateRow(row.id, { rate: e.target.value })} /></td>
                    <td className="p-2 border">{row.qty && row.rate ? (Number(row.qty) * Number(row.rate)).toFixed(2) : ''}</td>
                    <td className="p-2 border"><button onClick={() => removeRow(row.id)} className="p-2 text-red-500 hover:bg-red-50 transition-all" aria-label="Remove row"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 border-2 border-black font-bold">Cancel</button>
          <button onClick={save} className="bg-black text-white px-6 py-2 border-2 border-black font-bold">Save WO</button>
        </div>
      </div>
    </div>
  );
};
