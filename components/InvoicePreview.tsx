
import React, { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
import { BusinessProfile, Invoice, InvoiceItem, Client, WorkOrder } from '../types';
import { formatCurrency, numberToWords, applyTextCase } from '../utils/helpers';
import { toDisplayDate, toInputDate } from '../utils/formatters';
import { Search, Plus, Trash2, X, ClipboardList } from 'lucide-react';

interface InvoicePreviewProps {
  profile: BusinessProfile;
  invoice: Invoice;
  isEditable?: boolean;
  onUpdate?: (updates: Partial<Invoice>) => void;
  clients?: Client[];
  catalog?: Partial<InvoiceItem>[];
  onPageSizeChange?: (pages: number) => void;
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({  
  profile, 
  invoice, 
  isEditable = false, 
  onUpdate,
  clients = [],
  onPageSizeChange
}, ref) => {
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showWOSearch, setShowWOSearch] = useState(false);
  const [clientFilter, setClientFilter] = useState('');
  const lastPageCountRef = useRef<number>(1);

  // A4 height in pixels at 96 DPI: 297mm = ~1123px
  const A4_HEIGHT_PX = 1123;

  useEffect(() => {
    const element = ref && typeof ref === 'object' && 'current' in ref ? ref.current : null;
    if (element && onPageSizeChange) {
      const height = element.offsetHeight;
      const pages = Math.ceil(height / A4_HEIGHT_PX);
      
      // Only notify if page count changed
      if (pages > 1 && pages !== lastPageCountRef.current) {
        lastPageCountRef.current = pages;
        onPageSizeChange(pages);
      } else if (pages === 1 && lastPageCountRef.current > 1) {
        lastPageCountRef.current = 1;
      }
    }
  }, [invoice.items, invoice.client, onPageSizeChange, ref]);

  const calculateTotals = () => {
    const subTotal = invoice.items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
    const isIntraState = invoice.client.stateCode === profile.stateCode;
    
    const cgst = isIntraState ? subTotal * (invoice.cgstRate / 100) : 0;
    const sgst = isIntraState ? subTotal * (invoice.sgstRate / 100) : 0;
    const igst = !isIntraState ? subTotal * (invoice.igstRate / 100) : 0;
    
    const grandTotal = subTotal + cgst + sgst + igst;
    return { subTotal, cgst, sgst, igst, grandTotal };
  };

  const { subTotal, cgst, sgst, igst, grandTotal } = calculateTotals();

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientFilter.toLowerCase()) || 
      c.gstNo.toLowerCase().includes(clientFilter.toLowerCase())
    );
  }, [clients, clientFilter]);

  const handleItemUpdate = (id: string, updates: Partial<InvoiceItem>) => {
    if (!onUpdate) return;
    const newItems = invoice.items.map(item => item.id === id ? { ...item, ...updates } : item);
    onUpdate({ items: newItems });
  };

  const removeItem = (id: string) => {
    if (!onUpdate) return;
    onUpdate({ items: invoice.items.filter(item => item.id !== id) });
  };

  const addItem = () => {
    if (!onUpdate) return;
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      hsn: '997329',
      uom: 'NOS.',
      qty: 1,
      rate: 0
    };
    onUpdate({ items: [...invoice.items, newItem] });
  };

  const selectWorkOrder = (wo: WorkOrder) => {
    if (!onUpdate) return;
    onUpdate({
      workOrderNo: wo.number,
      workOrderDate: wo.date,
      items: wo.items.length > 0 ? wo.items.map(i => ({...i, id: Date.now() + Math.random().toString()})) : invoice.items
    });
    setShowWOSearch(false);
  };

  const editInputStyle = "w-full bg-transparent border-none outline-none p-0 m-0 focus:ring-0 leading-normal align-middle";
  const textCaseClass = profile.textCase === 'normal' ? '' : '';

  return (
    <div ref={ref} className={`invoice-container bg-white w-full max-w-[1300px] mx-auto text-[10px] leading-tight text-black font-sans print:max-w-none print:shadow-none print:m-0 ${textCaseClass}`} style={{ 
      WebkitPrintColorAdjust: 'exact', 
      printColorAdjust: 'exact',
      colorAdjust: 'exact'
    }}>
      
      <div className="mb-3">
        <div className="text-center font-bold text-xl tracking-widest pb-1 uppercase">Tax Invoice</div>
        <div className="text-right text-[9px] font-bold tracking-wide border-b-2 border-black pb-1 uppercase">Original for Recipient</div>
      </div>

      <div className="border-[1.5px] border-black">
        {/* Main Header Sections */}
        <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
          {/* LEFT COLUMN */}
          <div className="divide-y divide-black">
            <div className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  {isEditable ? (
                    <textarea 
                      className="text-sm font-bold mb-0 w-full bg-transparent border-none outline-none focus:ring-0 resize-none overflow-hidden leading-tight" 
                      defaultValue={profile.name}
                      placeholder="Company Name"
                      rows={2}
                    />
                  ) : (
                    <h1 className="text-sm font-bold mb-0 whitespace-normal break-words leading-tight">{profile.name}</h1>
                  )}
                </div>
                {profile.logo && (
                  <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center border border-gray-100 p-1">
                    <img src={profile.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
              
              <div className="text-[12px] max-w-[60%]">
                <p className="leading-[1.4] line-clamp-3 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'}}>
                  {isEditable ? <textarea className={editInputStyle + " h-14 resize-none leading-normal"} defaultValue={profile.address} /> : profile.address}
                </p>
                <div className="flex font-bold mt-1 items-baseline">
                  <span>GSTIN:</span>
                  {isEditable ? <input className={editInputStyle + " font-bold flex-1"} defaultValue={profile.gstNo} /> : <span className="flex-1">{profile.gstNo}</span>}
                </div>
                <div className="flex items-baseline">
                  <span>PAN NO:</span>
                  {isEditable ? <input className={editInputStyle + " flex-1"} defaultValue={profile.panNo} /> : <span className="flex-1">{profile.panNo}</span>}
                </div>
                <div className="flex items-baseline" style={{gap: '10px'}}>
                  <div className="flex items-baseline whitespace-nowrap" style={{gap: '4px'}}>
                    <span>STATE NAME:</span>
                    {isEditable ? <input className={editInputStyle} defaultValue={profile.state} style={{width: '80px'}} /> : <span>{profile.state}</span>}
                  </div>
                  <div className="flex items-baseline whitespace-nowrap" style={{gap: '4px'}}>
                    <span>CODE:</span>
                    {isEditable ? <input className={editInputStyle + " w-10"} defaultValue={profile.stateCode} /> : <span className="w-10">{profile.stateCode}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 relative group">
              <div className="font-bold text-[8px] mb-1  text-gray-500">Buyer (Bill to)</div>
              <h2 className="font-bold text-sm mb-1">{invoice.client.name || 'Select Client...'}</h2>
              <div className="text-[12px] max-w-[85%]">
                <div className="mb-2">
                  {isEditable ? <textarea className={editInputStyle + " resize-none whitespace-pre-line overflow-hidden w-full"} rows={3} value={invoice.client.address || ''} onChange={e => onUpdate?.({ client: { ...invoice.client, address: e.target.value } })} style={{minHeight: '3.5rem'}} /> : <p className="leading-[1.4] whitespace-pre-line">{invoice.client.address}</p>}
                </div>
                <div className="flex font-bold items-baseline">
                  <span>GSTIN:</span>
                  {isEditable ? <input className={editInputStyle + " font-bold flex-1"} value={invoice.client.gstNo || ''} onChange={e => onUpdate?.({ client: { ...invoice.client, gstNo: e.target.value } })} /> : <span className="flex-1">{invoice.client.gstNo}</span>}
                </div>
                <div className="flex items-baseline mt-0.5" style={{gap: '10px'}}>
                  <div className="flex items-baseline whitespace-nowrap" style={{gap: '4px'}}>
                    <span>STATE NAME :</span>
                    {isEditable ? <input className={editInputStyle} value={invoice.client.state || ''} onChange={e => onUpdate?.({ client: { ...invoice.client, state: e.target.value } })} style={{width: '80px'}} /> : <span>{invoice.client.state}</span>}
                  </div>
                  <div className="flex items-baseline whitespace-nowrap" style={{gap: '4px'}}>
                    <span>CODE :</span>
                    {isEditable ? <input className={editInputStyle + " w-10"} value={invoice.client.stateCode || ''} onChange={e => onUpdate?.({ client: { ...invoice.client, stateCode: e.target.value } })} /> : <span className="w-10">{invoice.client.stateCode}</span>}
                  </div>
                </div>
              </div>
              {isEditable && (
                <button onClick={() => setShowClientSearch(!showClientSearch)} className="absolute top-1 right-1 p-1 bg-gray-100 rounded no-print opacity-0 group-hover:opacity-100 transition-opacity">
                  <Search size={12}/>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="divide-y divide-black flex flex-col">
            <div className="divide-y divide-black">
              <div className="p-2.5">
                <div className="font-bold text-[8px] mb-1  text-gray-500">Invoice No.</div>
                <div className="font-bold  text-[10px]">
                  {isEditable ? <input className={editInputStyle + " font-bold"} value={invoice.invoiceNo || ''} onChange={e => onUpdate?.({invoiceNo: e.target.value})} /> : invoice.invoiceNo}
                </div>
              </div>
              <div className="p-2.5">
                <div className="font-bold text-[8px] mb-1  text-gray-500">Invoice Date</div>
                <div className="font-bold  text-[10px]">
                  {isEditable ? <input type="text" className={editInputStyle + " font-bold"} value={toDisplayDate(invoice.invoiceDate)} onChange={e => {
                    const val = e.target.value;
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
                      onUpdate?.({invoiceDate: toInputDate(val)});
                    }
                  }} placeholder="DD/MM/YYYY" /> : toDisplayDate(invoice.invoiceDate)}
                </div>
              </div>
            </div>

            <div className="divide-y divide-black flex-1 relative group">
              <div className="p-2.5">
                <div className="font-bold text-[8px] mb-1  text-gray-500">Work Order Number</div>
                <div className="font-bold  text-[10px]">
                  {isEditable ? <input className={editInputStyle + " font-bold"} value={invoice.workOrderNo || ''} onChange={e => onUpdate?.({workOrderNo: e.target.value})} /> : (invoice.workOrderNo || '-')}
                </div>
              </div>
              <div className="p-2.5">
                <div className="font-bold text-[8px] mb-1  text-gray-500">Work Order Date</div>
                <div className="font-bold  text-[10px]">
                  {isEditable ? <input type="text" className={editInputStyle + " font-bold"} value={invoice.workOrderDate ? toDisplayDate(invoice.workOrderDate) : ''} onChange={e => {
                    const val = e.target.value;
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
                      onUpdate?.({workOrderDate: toInputDate(val)});
                    } else if (val === '') {
                      onUpdate?.({workOrderDate: ''});
                    }
                  }} placeholder="DD/MM/YYYY" /> : (invoice.workOrderDate ? toDisplayDate(invoice.workOrderDate) : '-')}
                </div>
              </div>
              <div className="p-2.5">
                <div className="font-bold text-[8px] mb-1  text-gray-500">HSN/SAC Code</div>
                <div className="font-bold  text-[10px]">
                  {isEditable ? <input className={editInputStyle + " font-bold"} value={invoice.hsnCode || ''} onChange={e => onUpdate?.({hsnCode: e.target.value})} /> : (invoice.hsnCode || '-')}
                </div>
              </div>
              {isEditable && invoice.client.workOrders && invoice.client.workOrders.length > 0 && (
                <button 
                  onClick={() => setShowWOSearch(!showWOSearch)}
                  className="absolute top-1 right-1 p-1 bg-gray-100 rounded no-print opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[8px] font-bold "
                >
                  <ClipboardList size={12}/> Load WO
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-black text-center font-bold  text-[9px] bg-gray-50" style={{ backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="border-r border-black p-2 w-10 align-middle" style={{ borderColor: '#000', borderWidth: '0 1px 0 0', borderStyle: 'solid', verticalAlign: 'middle' }}>Sl No.</th>
              <th className="border-r border-black p-2 text-center align-middle" style={{ borderColor: '#000', borderWidth: '0 1px 0 0', borderStyle: 'solid', verticalAlign: 'middle' }}>Description of Services</th>
              <th className="border-r border-black p-2 w-16 align-middle" style={{ borderColor: '#000', borderWidth: '0 1px 0 0', borderStyle: 'solid', verticalAlign: 'middle' }}>UoM</th>
              <th className="border-r border-black p-2 w-24 align-middle" style={{ borderColor: '#000', borderWidth: '0 1px 0 0', borderStyle: 'solid', verticalAlign: 'middle' }}>Rate</th>
              <th className="border-r border-black p-2 w-16 align-middle" style={{ borderColor: '#000', borderWidth: '0 1px 0 0', borderStyle: 'solid', verticalAlign: 'middle' }}>Quantity</th>
              <th className="p-2 w-32 text-right align-middle" style={{ verticalAlign: 'middle' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={item.id} className="text-[9px] border-b border-black last:border-b-0">
                <td className="border-r border-black px-1 py-2 text-center" style={{ verticalAlign: 'middle' }}>
                  <span className="leading-none">{idx + 1}</span>
                </td>
                <td className="border-r border-black px-2 py-2 font-bold  whitespace-pre-wrap" style={{ verticalAlign: 'middle' }}>
                  <div className="flex items-center group">
                   {isEditable ? (
                     <div className="flex gap-1 items-center flex-1">
                        <textarea 
                          className={editInputStyle + " font-bold resize-none overflow-hidden flex-1 p-0 m-0 block h-auto leading-[1.2]"} 
                          rows={1}
                          value={item.description} 
                          onChange={e => handleItemUpdate(item.id, { description: e.target.value })} 
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                        <button onClick={() => removeItem(item.id)} className="no-print opacity-0 group-hover:opacity-100 text-red-500 p-1 transition-opacity flex-shrink-0"><Trash2 size={12}/></button>
                     </div>
                   ) : (
                    <span className="block flex-1 leading-[1.2]">{item.description}</span>
                   )}
                  </div>
                </td>
                <td className="border-r border-black px-2 py-2 text-center" style={{ verticalAlign: 'middle' }}>
                  {isEditable ? <input className={editInputStyle + " text-center"} value={item.uom} onChange={e => handleItemUpdate(item.id, { uom: e.target.value })} /> : item.uom}
                </td>
                <td className="border-r border-black px-2 py-2 text-right" style={{ verticalAlign: 'middle' }}>
                  {isEditable ? <input type="number" className={editInputStyle + " text-right"} value={item.rate} onChange={e => handleItemUpdate(item.id, { rate: parseFloat(e.target.value) || 0 })} /> : formatCurrency(item.rate)}
                </td>
                <td className="border-r border-black px-2 py-2 text-center" style={{ verticalAlign: 'middle' }}>
                  {isEditable ? <input type="number" className={editInputStyle + " text-center"} value={item.qty} onChange={e => handleItemUpdate(item.id, { qty: parseFloat(e.target.value) || 0 })} /> : item.qty.toFixed(2)}
                </td>
                
                <td className="px-2 py-2 text-right font-bold" style={{ verticalAlign: 'middle' }}>
                  {formatCurrency(item.qty * item.rate)}
                </td>
              </tr>
            ))}
            
            <tr className="font-bold text-[9px] border-t border-black">
              <td colSpan={5} className="py-2 px-2 text-right" style={{ verticalAlign: 'middle' }}>Sub Total</td>
              <td className="py-2 px-2 text-right border-l border-black" style={{ verticalAlign: 'middle' }}>{formatCurrency(subTotal)}</td>
            </tr>

            {invoice.client.stateCode === profile.stateCode ? (
              <>
                <tr className="font-bold text-[9px]">
                  <td colSpan={5} className="py-2 px-2 text-right" style={{ verticalAlign: 'middle' }}>Addition CGST @{isEditable ? <input type="text" className="w-6 bg-transparent outline-none text-right font-bold p-0 m-0 inline-block align-baseline" value={invoice.cgstRate} onChange={e => { const val = e.target.value.replace(/[^0-9.]/g, ''); onUpdate?.({ cgstRate: parseFloat(val) || 0 }); }} /> : invoice.cgstRate}%</td>
                  <td className="py-2 px-2 text-right border-l border-black border-t border-black" style={{ verticalAlign: 'middle' }}>{formatCurrency(cgst)}</td>
                </tr>
                <tr className="font-bold text-[9px]">
                  <td colSpan={5} className="py-2 px-2 text-right" style={{ verticalAlign: 'middle' }}>Addition SGST @{isEditable ? <input type="text" className="w-6 bg-transparent outline-none text-right font-bold p-0 m-0 inline-block align-baseline" value={invoice.sgstRate} onChange={e => { const val = e.target.value.replace(/[^0-9.]/g, ''); onUpdate?.({ sgstRate: parseFloat(val) || 0 }); }} /> : invoice.sgstRate}%</td>
                  <td className="py-2 px-2 text-right border-l border-black border-t border-black" style={{ verticalAlign: 'middle' }}>{formatCurrency(sgst)}</td>
                </tr>
              </>
            ) : (
              <tr className="font-bold text-[9px]">
                <td colSpan={5} className="py-2 px-2 text-right" style={{ verticalAlign: 'middle' }}>Addition IGST @{isEditable ? <input type="text" className="w-6 bg-transparent outline-none text-right font-bold p-0 m-0 inline-block align-baseline" value={invoice.igstRate} onChange={e => { const val = e.target.value.replace(/[^0-9.]/g, ''); onUpdate?.({ igstRate: parseFloat(val) || 0 }); }} /> : invoice.igstRate}%</td>
                <td className="py-2 px-2 text-right border-l border-black border-t border-black" style={{ verticalAlign: 'middle' }}>{formatCurrency(igst)}</td>
              </tr>
            )}

            <tr className="border-t border-black font-bold">
              <td colSpan={5} className="py-2 px-2 text-right  text-[10px]" style={{ verticalAlign: 'middle' }}>Total Amount Chargeable</td>
              <td className="py-2 px-2 text-right text-[10px] border-l border-black bg-gray-50" style={{ backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', verticalAlign: 'middle' }}>₹ {formatCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div className="p-3 border-t border-black font-bold  text-[9px]">
          Amount in word : {numberToWords(grandTotal)}
        </div>

        {/* Bank and Signatory Footer Section */}
        <div className="border-t border-black grid grid-cols-2 divide-x divide-black min-h-[140px]">
          <div className="flex flex-col h-full">
            <div className="p-2 bg-gray-50 border-b border-black" style={{ backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <div className="font-bold tracking-wide text-[8px] text-gray-500">Company's Bank Details</div>
            </div>
            <div className="flex-1 grid grid-cols-2 divide-x divide-black">
              <div className="divide-y divide-black h-full flex flex-col">
                <div className="p-3 flex-1 flex items-center">Bank Name :</div>
                <div className="p-3 flex-1 flex items-center">A/c No. :</div>
                <div className="p-3 flex-1 flex items-center">Branch & IFSC :</div>
              </div>
              <div className="divide-y divide-black h-full flex flex-col">
                <div className="p-3 font-bold flex-1 flex items-center">
                  {isEditable ? <input className={editInputStyle + " font-bold"} defaultValue={profile.bankDetails?.bankName || ''} /> : (profile.bankDetails?.bankName || '')}
                </div>
                <div className="p-3 font-bold flex-1 flex items-center">
                  {isEditable ? <input className={editInputStyle + " font-bold"} defaultValue={profile.bankDetails?.accountNo || ''} /> : (profile.bankDetails?.accountNo || '')}
                </div>
                <div className="p-3 font-bold flex-1 flex items-center">
                  {isEditable ? <input className={editInputStyle + " font-bold"} defaultValue={profile.bankDetails?.ifscCode || ''} /> : (profile.bankDetails?.ifscCode || '')}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Signatory */}
          <div className="p-5 text-right flex flex-col justify-between">
            <div className="text-[10px] font-bold tracking-tight text-black">For {profile.name}</div>
            <div className="mt-32">
               <div className="font-bold border-t-[1.5px] border-black pt-1.5 inline-block min-w-[180px] text-center text-[10px] tracking-wide leading-none">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-6 text-[8px]  font-bold tracking-[0.2em] text-gray-500 no-print">
        This is a Computer Generated Invoice • Subject to {profile.state} Jurisdiction
      </div>

      {showClientSearch && isEditable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print backdrop-blur-sm">
          <div className="bg-white w-full max-w-md border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
              <h3 className="font-bold  text-sm tracking-widest">Select Vendor</h3>
              <button onClick={() => setShowClientSearch(false)} className="hover:rotate-90 transition-transform"><X size={20}/></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                placeholder="SEARCH BY NAME OR GSTIN..." 
                className="w-full border-2 border-black p-3 pl-10 outline-none font-bold text-xs  focus:bg-slate-50" 
                onChange={e => setClientFilter(e.target.value)} 
                autoFocus 
              />
            </div>
            <div className="max-h-80 overflow-y-auto border-2 border-black divide-y-2 divide-black">
              {filteredClients.length > 0 ? filteredClients.map(c => (
                <button key={c.id} className="w-full text-left p-4 hover:bg-black hover:text-white transition-colors  text-[10px] font-bold block group" onClick={() => { onUpdate?.({ client: c }); setShowClientSearch(false); }}>
                  <div className="flex justify-between items-center">
                    <span>{c.name}</span>
                    <span className="text-[8px] opacity-50 group-hover:opacity-100">{c.gstNo}</span>
                  </div>
                </button>
              )) : (
                <div className="p-8 text-center text-gray-400 font-bold  text-xs">No Vendors Found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showWOSearch && isEditable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print backdrop-blur-sm">
          <div className="bg-white w-full max-w-md border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
              <h3 className="font-bold  text-sm tracking-widest">Select Work Order</h3>
              <button onClick={() => setShowWOSearch(false)} className="hover:rotate-90 transition-transform"><X size={20}/></button>
            </div>
            <div className="max-h-80 overflow-y-auto border-2 border-black divide-y-2 divide-black">
              {invoice.client.workOrders?.map(wo => (
                <button 
                  key={wo.id} 
                  className="w-full text-left p-4 hover:bg-black hover:text-white transition-colors  text-[10px] font-bold block group" 
                  onClick={() => selectWorkOrder(wo)}
                >
                  <div className="flex justify-between items-center">
                    <span>WO: {wo.number}</span>
                    <span className="text-[8px] opacity-50 group-hover:opacity-100">{toDisplayDate(wo.date)}</span>
                  </div>
                  <div className="text-[7px] mt-1 opacity-60">
                    {wo.items.length} Line Items
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEditable && (
        <div className="mt-8 flex justify-center no-print pb-12">
          <button onClick={addItem} className="border-2 border-black bg-white text-black px-10 py-3 font-bold  text-[10px] tracking-widest hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
             <Plus size={14} className="inline mr-2" /> Add New Item Line
          </button>
        </div>
      )}
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
