
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Package, 
  Trash2, 
  Download, 
  Building, 
  ArrowLeft, 
  ExternalLink,
  ChevronRight,
  Plus,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Database,
  Info,
  // Added CreditCard icon to fix the missing name error
  CreditCard,
  Edit3
} from 'lucide-react';
import { db, initializeDB } from './services/db';
import { BusinessProfile, Client, Invoice, InvoiceItem, User } from './types';
import { LogoUploader } from './components/LogoUploader';
import { InvoicePreview } from './components/InvoicePreview';
import { Toasts } from './components/Toast';
import { WorkOrderModal } from './components/WorkOrderModal';
import { formatCurrency } from './utils/helpers';
import { toDisplayDate, getTodayInput } from './utils/formatters';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { authAPI, profileAPI, clientsAPI, catalogAPI, invoicesAPI } from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'clients' | 'settings'>('dashboard');
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');

  // Toasts
  const [toasts, setToasts] = useState<import('./components/Toast').ToastMessage[]>([]);
  const addToast = (type: import('./components/Toast').ToastType, text: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2,8);
    setToasts(prev => [...prev, { id, type, text }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  
  const [profile, setProfile] = useState<BusinessProfile>({
    name: '',
    tagline: '',
    address: '',
    gstNo: '',
    panNo: '',
    email: '',
    phone: '',
    bankDetails: {
      bankName: '',
      ifscCode: '',
      accountNo: ''
    },
    logo: '',
    cin: '',
    state: '',
    stateCode: '',
    textCase: 'normal'
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<InvoiceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formWorkOrders, setFormWorkOrders] = useState<import('./types').WorkOrder[]>([]);
  const [newWONumber, setNewWONumber] = useState('');
  const [newWODate, setNewWODate] = useState('');

  // Work Order modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalWO, setModalWO] = useState<import('./types').WorkOrder | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfDataURL, setPdfDataURL] = useState<string>('');
  const invoiceRef = useRef<HTMLDivElement>(null);
  const pdfInvoiceRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Login states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [showSetupInSettings, setShowSetupInSettings] = useState(false);

  const [loginPassword, setLoginPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Initialize app
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
      setShowLogin(false);
      loadData();
    } else {
      setShowLogin(true);
    }
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, clientsRes, catalogRes, invoicesRes] = await Promise.all([
        profileAPI.get(),
        clientsAPI.getAll(),
        catalogAPI.getAll(),
        invoicesAPI.getAll()
      ]);

      if (profileRes.data && Object.keys(profileRes.data).length > 0) {
        const data = profileRes.data;
        const normalizedProfile = {
          name: data.name || '',
          tagline: data.tagline || '',
          address: data.address || '',
          gstNo: data.gstNo || data.gst_no || '',
          panNo: data.panNo || data.pan_no || '',
          email: data.email || '',
          phone: data.phone || '',
          bankDetails: data.bankDetails || {
            bankName: data.bankName || data.bank_name || '',
            ifscCode: data.ifscCode || data.ifsc_code || '',
            accountNo: data.accountNo || data.account_no || ''
          },
          logo: data.logo || '',
          cin: data.cin || '',
          state: data.state || '',
          stateCode: data.stateCode || data.state_code || '',
          textCase: (data.textCase as 'uppercase' | 'normal') || 'normal'
        };
        setProfile(normalizedProfile);
      } else {
        setActiveTab('settings');
        setShowSetupInSettings(true);
      }

      setClients(clientsRes.data);
      setCatalog(catalogRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await authAPI.login({ username: loginUsername, password: loginPassword });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      setShowLogin(false);
      // Load data
      await loadData();
    } catch (error) {
      addToast('error', 'Invalid credentials');
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await authAPI.register({ username: loginUsername, password: loginPassword });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      setShowLogin(false);
      setIsCreatingUser(false);
      // Load data
      await loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleSetupCompany = async (companyProfile: BusinessProfile) => {
    try {
      const profileData = {
        ...companyProfile,
        bankName: companyProfile.bankDetails?.bankName || '',
        ifscCode: companyProfile.bankDetails?.ifscCode || '',
        accountNo: companyProfile.bankDetails?.accountNo || ''
      };
      delete profileData.bankDetails;
      await profileAPI.save(profileData);
      setProfile(companyProfile);
      setShowSetupInSettings(false);
      setActiveTab('dashboard');
    } catch (error) {
      addToast('error', 'Failed to save company profile');
    }
  };

  const handleSaveInvoice = async (finalize = false) => {
    if (!currentInvoice) return;
    try {
      // Transform invoice data for backend (extract clientId from client object)
      const invoicePayload = {
        ...currentInvoice,
        clientId: currentInvoice.client.id
      };
      
      // Check if this is an update (invoice already has a backend id) or create
      const isUpdate = invoices.some(inv => inv.id === currentInvoice.id);
      
      if (isUpdate) {
        await invoicesAPI.update(currentInvoice.id, invoicePayload);
        const updatedInvoices = invoices.map(inv => inv.id === currentInvoice.id ? currentInvoice : inv);
        setInvoices(updatedInvoices);
      } else {
        const response = await invoicesAPI.create(invoicePayload);
        const newInvoices = [response.data, ...invoices];
        setInvoices(newInvoices);
      }
      
      if (finalize) {
        setViewMode('LIST');
        addToast('success', 'Invoice saved successfully');
      } else {
        addToast('success', 'Draft saved');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      addToast('error', 'Failed to save invoice');
    }
  };

  const handleSaveVendor = async (vendor: Client) => {
    try {
      const response = await clientsAPI.create(vendor);
      const newClients = [response.data, ...clients];
      setClients(newClients);
      setViewMode('LIST');
      setFormWorkOrders([]);
      addToast('success', 'Vendor saved');
    } catch (error) {
      console.error('Error saving vendor:', error);
      addToast('error', 'Failed to save vendor');
    }
  };

  const handleUpdateVendor = async (id: string, updates: Partial<Client>) => {
    try {
      const response = await clientsAPI.update(id, updates);
      const updatedClient = response.data;
      const updatedClients = clients.map(c => c.id === id ? updatedClient : c);
      setClients(updatedClients);
      setViewMode('LIST');
      setEditingClient(null);
      setFormWorkOrders([]);
      addToast('success', 'Vendor updated');
    } catch (error) {
      console.error('Error updating vendor:', error);
      addToast('error', 'Failed to update vendor');
    }
  };



  const startEditClient = (client: Client) => {
    setEditingClient(client);
    setFormWorkOrders(client.workOrders || []);
    setViewMode('CREATE');
  };

  const startNewClient = () => {
    setEditingClient(null);
    setFormWorkOrders([]);
    setNewWONumber('');
    setNewWODate('');
    setViewMode('CREATE');
  };

  const cancelEdit = () => {
    setEditingClient(null);
    setFormWorkOrders([]);
    setViewMode('LIST');
  };

  // Modal save/cancel handlers
  const handleModalSaveWO = async (wo: import('./types').WorkOrder) => {
    if (!editingClient) {
      // creating a new client scenario: just update local state
      if (modalIndex !== null && modalIndex >= 0) {
        setFormWorkOrders(prev => prev.map((p, i) => i === modalIndex ? wo : p));
      } else {
        setFormWorkOrders(prev => [wo, ...prev]);
      }
    } else {
      // editing an existing client: check if WO already exists on server
      const existsOnServer = editingClient.workOrders?.some(w => String(w.id) === String(wo.id));
      if (existsOnServer) {
        try {
          const res = await clientsAPI.updateWorkOrder(editingClient.id, wo.id as any, wo);
          const saved = res.data;
          setFormWorkOrders(prev => prev.map(p => String(p.id) === String(wo.id) ? { ...saved } : p));
          addToast('success', 'WO updated');
        } catch (error: any) {
          console.error('Failed updating WO', error);
          const msg = error?.response?.data?.error || error.message || 'Failed to update WO';
          addToast('error', msg);
        }
      } else {
        // create on server
        try {
          const res = await clientsAPI.createWorkOrder(editingClient.id, { number: wo.number, date: wo.date, items: wo.items });
          const saved = res.data;
          if (modalIndex !== null && modalIndex >= 0) {
            // replace the local entry with saved
            setFormWorkOrders(prev => prev.map((p, i) => i === modalIndex ? saved : p));
          } else {
            setFormWorkOrders(prev => [saved, ...prev]);
          }
          addToast('success', 'WO created');
        } catch (error: any) {
          console.error('Failed creating WO', error);
          const msg = error?.response?.data?.error || error.message || 'Failed to create WO';
          addToast('error', msg);
        }
      }
    }

    setModalOpen(false);
    setModalWO(null);
    setModalIndex(null);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setModalWO(null);
    setModalIndex(null);
  };

  const handleSaveProfile = async (updatedProfile: BusinessProfile) => {
    try {
      // Flatten bankDetails to match backend fields
      const payload = {
        ...updatedProfile,
        bankName: updatedProfile.bankDetails?.bankName || '',
        ifscCode: updatedProfile.bankDetails?.ifscCode || '',
        accountNo: updatedProfile.bankDetails?.accountNo || ''
      };
      // Remove nested bankDetails before sending
      delete payload.bankDetails;

      await profileAPI.save(payload);
      setProfile(updatedProfile);
      addToast('success', 'Profile saved');
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast('error', 'Failed to save profile');
    }
  };

  const handleSaveCatalogItem = async (item: InvoiceItem) => {
    try {
      const response = await catalogAPI.create(item);
      const newCatalog = [response.data, ...catalog];
      setCatalog(newCatalog);
      addToast('success', 'Item saved');
    } catch (error) {
      console.error('Error saving catalog item:', error);
      addToast('error', 'Failed to save item');
    }
  };

  const stats = useMemo(() => {
    const revenue = invoices.reduce((acc, inv) => acc + inv.items.reduce((a, b) => a + (b.qty * b.rate), 0), 0);
    return { revenue, vendors: clients.length, total: invoices.length };
  }, [invoices, clients]);

  const inputStyles = "w-full px-4 py-3 bg-white border-2 border-black rounded-none outline-none font-bold text-xs focus:bg-slate-50 transition-all";
  const labelStyles = "block text-[10px] font-bold text-black mb-1.5 ml-0.5";

  return (
    <>
      {/* Toasts */}
      <Toasts toasts={toasts} removeToast={removeToast} />
      {/* WorkOrder Modal */}
      <WorkOrderModal open={modalOpen} onClose={handleModalClose} onSave={handleModalSaveWO} initial={modalWO} />
      {showLogin && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="bg-white p-10 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-center tracking-tight">Login</h2>
            <div className="space-y-4">
              <div>
                <label className={labelStyles}>Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={inputStyles}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className={labelStyles}>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={inputStyles}
                  placeholder="Enter password"
                />
              </div>
              <button
                onClick={isCreatingUser ? handleCreateUser : handleLogin}
                className="w-full bg-black text-white py-3 border-2 border-black font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                {isCreatingUser ? 'Create Account' : 'Login'}
              </button>
              {!isCreatingUser && (
                <button
                  onClick={() => setIsCreatingUser(true)}
                  className="w-full bg-white text-black py-3 border-2 border-black font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Create New Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {!showLogin && (
    <div className="min-h-screen flex bg-slate-50 text-black font-sans">
      <aside className="no-print w-64 bg-white border-r-2 border-black flex flex-col sticky top-0 h-screen z-40">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]">
              <Building className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tighter text-black">Pramukh ERP</h1>
              {/* <span className="text-[8px] font-bold text-gray-500 tracking-wider">Anywhere Access</span> */}
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'ledger', icon: CreditCard, label: 'Invoices' },
              { id: 'clients', icon: Users, label: 'Vendors' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setViewMode('LIST'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 border-2 border-transparent transition-all ${activeTab === item.id ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-black hover:border-black'}`}
              >
                <item.icon size={16} />
                <span className="font-bold text-[10px] tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-16 px-8 flex items-center justify-between border-b-2 border-black bg-white sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {viewMode !== 'LIST' && (
              <button onClick={() => setViewMode('LIST')} className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all"><ArrowLeft size={16}/></button>
            )}
            <h2 className="text-[10px] font-bold text-black tracking-wide capitalize">{activeTab}</h2>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto space-y-10">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">Total Billing</p>
                  <p className="text-2xl font-bold">₹ {formatCurrency(stats.revenue)}</p>
                </div>
                <div className="bg-white p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">Cloud Vendors</p>
                  <p className="text-2xl font-bold">{stats.vendors}</p>
                </div>
                <div className="bg-white p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">Stored Invoices</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="max-w-6xl mx-auto">
              {viewMode === 'LIST' ? (
                <>
                  <div className="flex justify-between items-center mb-10 border-b-2 border-black pb-4">
                    <h2 className="text-xl font-bold tracking-tight">Vendor Registry</h2>
                    {clients.length > 0 && (
                      <button onClick={() => startNewClient()} className="bg-black text-white px-8 py-3 border-2 border-black font-bold uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Plus size={16} className="inline mr-2" /> Add Vendor
                      </button>
                    )}
                  </div>
                  {clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-center">
                        <Users size={64} className="mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-bold mb-2">No Vendors Yet</h3>
                        <p className="text-gray-600 mb-6">Add your first vendor to get started</p>
                        <button onClick={() => startNewClient()} className="bg-black text-white px-8 py-4 border-2 border-black font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <Plus size={20} className="inline mr-2" /> Add First Vendor
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px] font-bold">
                        <thead className="bg-black text-white text-[9px]">
                          <tr><th className="p-4">Name</th><th className="p-4">GSTIN</th><th className="p-4">Location</th><th className="p-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/10">
                          {clients.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4">{c.name}</td>
                              <td className="p-4 text-gray-500">{c.gstNo || 'UNREGISTERED'}</td>
                              <td className="p-4">{c.state}</td>
                              <td className="p-4 text-right">
                                <button onClick={() => startEditClient(c)} className="p-2 text-sky-600 hover:bg-sky-50 transition-all mr-2" aria-label={`Edit ${c.name}`} title={`Edit ${c.name}`}><Edit3 size={16} /></button>
                                <button onClick={async () => { 
                                  try {
                                    await clientsAPI.delete(c.id);
                                    setClients(clients.filter(x => x.id !== c.id));
                                    addToast('success', 'Vendor deleted');
                                  } catch (error) {
                                    console.error('Error deleting client:', error);
                                    addToast('error', 'Failed to delete vendor');
                                  }
                                }} className="p-2 text-red-500 hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="max-w-2xl mx-auto bg-white p-10 border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="font-bold text-sm mb-10 border-b-2 border-black pb-4 tracking-tight">{editingClient ? 'Edit Vendor' : 'New Vendor Profile'}</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const payload = {
                      name: (fd.get('name') as string),
                      gstNo: ((fd.get('gst') as string) || ''),
                      state: ((fd.get('state') as string) || ''),
                      stateCode: (fd.get('stateCode') as string) || '',
                      address: (fd.get('address') as string),
                      pan: (fd.get('pan') as string) || '',
                      email: (fd.get('email') as string) || '',
                      phone: (fd.get('phone') as string) || '',
                      workOrders: formWorkOrders
                    } as Client;

                    if (editingClient) {
                      // when updating, include workOrders in payload
                      handleUpdateVendor(editingClient.id, payload);
                    } else {
                      const nc: Client = { id: Date.now().toString(), ...payload };
                      handleSaveVendor(nc);
                    }
                  }} className="space-y-6">
                    <div><label className={labelStyles}>Business Name</label><input name="name" defaultValue={editingClient?.name || ''} className={inputStyles} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className={labelStyles}>GSTIN</label><input name="gst" defaultValue={editingClient?.gstNo || ''} className={inputStyles} /></div>
                       <div><label className={labelStyles}>State Code</label><input name="stateCode" defaultValue={editingClient?.stateCode || ''} className={inputStyles} /></div>
                    </div>
                    <div><label className={labelStyles}>State Name</label><input name="state" defaultValue={editingClient?.state || ''} className={inputStyles} /></div>
                    <div className="max-w-2xl"><label className={labelStyles}>Billing Address</label><textarea name="address" defaultValue={editingClient?.address || ''} className={`${inputStyles} resize-none`} rows={3} required /></div>

                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelStyles}>PAN</label><input name="pan" defaultValue={editingClient?.pan || ''} className={inputStyles} /></div>
                      <div><label className={labelStyles}>Email</label><input name="email" defaultValue={editingClient?.email || ''} className={inputStyles} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelStyles}>Phone</label><input name="phone" defaultValue={editingClient?.phone || ''} className={inputStyles} /></div>
                      <div />
                    </div>

                    {/* Work Orders Section */}
                    <div className="border-t-2 border-black pt-4">
                      <h3 className="font-bold text-sm mb-4 tracking-tight">Work Orders</h3>

                      <div className="grid grid-cols-2 items-center mb-3">
                        <div className="text-sm text-gray-600">List of work orders associated to this vendor. Use the button to add or edit a WO.</div>
                        <div className="ml-4 flex justify-end">
                          <button type="button" onClick={() => { setModalOpen(true); setModalWO(null); }} className="bg-black text-white px-4 py-2 w-full max-w-xs border-2 border-black font-bold uppercase text-xs">Add WO</button>
                        </div>
                      </div>

                      {formWorkOrders.length === 0 ? (
                        <div className="text-gray-500 text-xs">No work orders added yet.</div>
                      ) : (
                        <table className="w-full text-left border-collapse text-[11px] font-bold">
                          <thead className="bg-black text-white text-[9px]">
                            <tr><th className="p-2">WO #</th><th className="p-2">Date</th><th className="p-2">Total Amount</th><th className="p-2 text-right">Actions</th></tr>
                          </thead>
                          <tbody className="divide-y-2 divide-black/10">
                            {formWorkOrders.map((wo, idx) => {
                              const total = (wo.items || []).reduce((a,b) => a + ((b.qty||0) * (b.rate||0)), 0);
                              return (
                                <tr key={wo.id} className="hover:bg-slate-50">
                                  <td className="p-2">{wo.number}</td>
                                  <td className="p-2">{toDisplayDate(wo.date)}</td>
                                  <td className="p-2">₹ {total.toFixed(2)}</td>
                                  <td className="p-2 text-right">
                                    <button type="button" onClick={() => { setModalOpen(true); setModalWO({ ...wo }); setModalIndex(idx); }} className="mr-2 text-sky-600" aria-label={`Edit WO ${wo.number}`} title={`Edit WO ${wo.number}`}><Edit3 size={16} /></button>
                                    <button type="button" onClick={async () => {
                                      // If this WO exists on server and we're editing an existing client, delete server-side
                                      if (editingClient && wo.id && String(wo.id).match(/^\d+$/)) {
                                        try {
                                          await clientsAPI.deleteWorkOrder(editingClient.id, wo.id as any);
                                          setFormWorkOrders(prev => prev.filter(x => x.id !== wo.id));
                                          addToast('success', 'WO deleted');
                                        } catch (error) {
                                          console.error('Failed to delete WO', error);
                                          addToast('error', 'Failed to delete WO');
                                        }
                                      } else {
                                        setFormWorkOrders(prev => prev.filter(x => x.id !== wo.id));
                                      }
                                    }} className="p-2 text-red-500 hover:bg-red-50 transition-all" aria-label="Remove WO"><Trash2 size={16} /></button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="flex justify-center gap-4 mt-6">
                      <button type="submit" className="bg-black text-white px-10 py-4 font-bold uppercase text-xs border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">{editingClient ? 'Update' : 'Save & Sync'}</button>
                      {editingClient && <button type="button" onClick={cancelEdit} className="bg-white text-black px-8 py-4 font-bold uppercase text-xs border-2 border-black">Cancel</button>}
                    </div>

                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="max-w-6xl mx-auto">
               {viewMode === 'LIST' ? (
                 <>
                   <div className="flex justify-between items-center mb-10 border-b-2 border-black pb-4">
                    <h2 className="text-xl font-bold tracking-tight">Invoice Ledger</h2>
                    {invoices.length > 0 && (
                      <div className="flex gap-3">
                        <button onClick={() => {
                          const ni: Invoice = {
                            id: Date.now().toString(),
                            invoiceNo: `PEPL/${(invoices.length + 1).toString().padStart(3, '0')}`,
                            invoiceDate: getTodayInput(),
                            dueDate: '',
                            client: clients[0] || { id: '', name: '', address: '', gstNo: '', state: 'GUJARAT', stateCode: '24' },
                            items: [{ id: '1', description: '', qty: 1, rate: 0, uom: 'NOS' }],
                            cgstRate: 9, sgstRate: 9, igstRate: 18, discount: 0, isPaid: false,
                            updatedAt: new Date().toISOString()
                          };
                          setCurrentInvoice(ni);
                          setViewMode('CREATE');
                        }} className="bg-black text-white px-8 py-3 border-2 border-black font-bold uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <Plus size={16} className="inline mr-2" /> New Invoice
                        </button>
                      </div>
                    )}
                  </div>
                  {invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-center">
                        <FileJson size={64} className="mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-bold mb-2 tracking-tight">No Invoices Yet</h3>
                        <p className="text-gray-600 mb-6">Create your first invoice to get started</p>
                        <button onClick={() => {
                          const ni: Invoice = {
                            id: Date.now().toString(),
                            invoiceNo: 'PEPL/001',
                            invoiceDate: getTodayInput(),
                            dueDate: '',
                            client: clients[0] || { id: '', name: '', address: '', gstNo: '', state: 'GUJARAT', stateCode: '24' },
                            items: [{ id: '1', description: '', qty: 1, rate: 0, uom: 'NOS' }],
                            cgstRate: 9, sgstRate: 9, igstRate: 18, discount: 0, isPaid: false,
                            updatedAt: new Date().toISOString()
                          };
                          setCurrentInvoice(ni);
                          setViewMode('CREATE');
                        }} className="bg-black text-white px-8 py-4 border-2 border-black font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <Plus size={20} className="inline mr-2" /> Create First Invoice
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px] font-bold">
                        <thead className="bg-black text-white text-[9px]">
                          <tr><th className="p-4">Inv #</th><th className="p-4">Date</th><th className="p-4">Vendor</th><th className="p-4 text-right">Amount</th><th className="p-4 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/10">
                          {invoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="p-4">{inv.invoiceNo}</td>
                              <td className="p-4">{toDisplayDate(inv.invoiceDate)}</td>
                              <td className="p-4">{inv.client.name}</td>
                              <td className="p-4 text-right font-bold">₹ {formatCurrency(inv.items.reduce((a,b)=>a+(b.qty*b.rate),0))}</td>
                              <td className="p-4 text-right">
                                <button onClick={() => {
                                  setCurrentInvoice(inv);
                                  setViewMode('CREATE');
                                }} className="p-2 text-blue-600 hover:bg-blue-50" title="Edit"><FileJson size={16}/></button>
                                <button onClick={async () => { 
                                  try {
                                    await invoicesAPI.delete(inv.id);
                                    setInvoices(invoices.filter(x => x.id !== inv.id));
                                    addToast('success', 'Invoice deleted');
                                  } catch (error) {
                                    console.error('Error deleting invoice:', error);
                                    addToast('error', 'Failed to delete invoice');
                                  }
                                }} className="p-2 text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                 </>
               ) : (
                 currentInvoice && (
                   <div className="space-y-10">
                    <div className="bg-white p-8">
                      <InvoicePreview
                        ref={invoiceRef} 
                        profile={profile} 
                        invoice={currentInvoice} 
                        isEditable={true} 
                        clients={clients} 
                        onUpdate={u => setCurrentInvoice({...currentInvoice, ...u})} 
                        onPageSizeChange={(pages) => {
                          if (pages > 1) {
                            addToast('info', `Invoice spans ${pages} pages`);
                          }
                        }}
                      />
                    </div>
                    {/* Hidden static invoice for PDF capture */}
                    <div ref={pdfContainerRef} className="fixed left-[-9999px] top-0 bg-white" style={{ width: '190mm', padding: '0' }}>
                      <InvoicePreview
                        ref={pdfInvoiceRef} 
                        profile={profile} 
                        invoice={currentInvoice} 
                        isEditable={false}
                      />
                    </div>
                    <div className="flex gap-4 mb-20 no-print">
                      <button onClick={() => handleSaveInvoice(false)} className="flex-1 bg-black text-white py-5 font-bold uppercase text-xs border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800">Save Draft</button>
                      {/* <button onClick={async () => {
                        if(!pdfContainerRef.current) {
                          addToast('error', 'Invoice content not ready');
                          return;
                        }
                        setIsDownloading(true);
                        try {
                          // Use the hidden static container with padding for PDF capture
                          const element = pdfContainerRef.current;
                          
                          // Wait for fonts to load
                          await document.fonts.ready;
                          
                          // Wait for any images to load
                          const images = element.querySelectorAll('img');
                          await Promise.all(
                            Array.from(images).map((img: HTMLImageElement) => {
                              if (img.complete) return Promise.resolve();
                              return new Promise(resolve => {
                                img.onload = resolve;
                                img.onerror = resolve;
                              });
                            })
                          );
                          
                          // Small delay to ensure everything is rendered
                          await new Promise(resolve => setTimeout(resolve, 200));
                          
                          // Get the actual rendered dimensions
                          const elementWidth = element.offsetWidth;
                          const elementHeight = element.offsetHeight;
                          
                          const canvas = await html2canvas(element, { 
                            scale: 2.5, // High quality capture optimized for A4
                            useCORS: true,
                            allowTaint: true,
                            logging: false,
                            backgroundColor: '#ffffff',
                            width: elementWidth,
                            height: elementHeight,
                            windowWidth: elementWidth,
                            windowHeight: elementHeight,
                            onclone: (clonedDoc) => {
                              // Remove any no-print elements
                              clonedDoc.querySelectorAll('.no-print').forEach(el => {
                                (el as HTMLElement).style.display = 'none';
                              });
                              
                              // Ensure backgrounds are visible
                              clonedDoc.querySelectorAll('.bg-gray-50').forEach(el => {
                                (el as HTMLElement).style.backgroundColor = '#f9fafb';
                              });
                              
                              // Ensure borders are visible
                              clonedDoc.querySelectorAll('[class*=\"border\"]').forEach(el => {
                                const style = (el as HTMLElement).style;
                                if (style.borderColor === 'rgb(0, 0, 0)' || style.borderColor === 'black') {
                                  style.borderColor = '#000000';
                                }
                              });
                            }
                          });
                          
                          const pdf = new jsPDF('p', 'mm', 'a4');
                          const pdfWidth = pdf.internal.pageSize.getWidth();
                          const pdfHeight = pdf.internal.pageSize.getHeight();
                          
                          // Define margins for the PDF
                          const marginLeft = 10;
                          const marginTop = 10;
                          const marginRight = 10;
                          const marginBottom = 10;
                          
                          // Calculate dimensions to fit A4 with margins
                          const canvasWidth = canvas.width;
                          const canvasHeight = canvas.height;
                          const availableWidth = pdfWidth - marginLeft - marginRight;
                          const availableHeight = pdfHeight - marginTop - marginBottom;
                          const ratio = canvasWidth / canvasHeight;
                          
                          let imgWidth = availableWidth;
                          let imgHeight = availableWidth / ratio;
                          
                          // If image is too tall, scale it down to fit
                          if (imgHeight > availableHeight) {
                            imgHeight = availableHeight;
                            imgWidth = availableHeight * ratio;
                          }
                          
                          // Convert canvas to high-quality image
                          const imgData = canvas.toDataURL('image/png', 1.0);
                          
                          if (imgHeight <= availableHeight) {
                            // Fits in one page with margins
                            pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight, undefined, 'FAST');
                          } else {
                            // Multiple pages needed - split properly
                            let heightLeft = imgHeight;
                            let position = marginTop;
                            
                            // First page
                            pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight, undefined, 'FAST');
                            heightLeft -= availableHeight;
                            
                            // Additional pages
                            while (heightLeft > 0) {
                              position -= pdfHeight;
                              pdf.addPage();
                              pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight, undefined, 'FAST');
                              heightLeft -= availableHeight;
                            }
                          }
                          
                          // Convert to Blob URL for better browser support
                          const pdfBlob = pdf.output('blob');
                          const blobUrl = URL.createObjectURL(pdfBlob);
                          
                          // Clean up old URL if exists
                          if (pdfDataURL && pdfDataURL.startsWith('blob:')) {
                            URL.revokeObjectURL(pdfDataURL);
                          }
                          
                          setPdfDataURL(blobUrl);
                          setShowPDFPreview(true);
                          addToast('success', 'PDF preview generated successfully');
                        } catch (error) {
                          console.error('PDF generation error:', error);
                          addToast('error', 'Failed to generate PDF preview');
                        }
                        setIsDownloading(false);
                      }} disabled={isDownloading} className="flex-1 bg-white text-black py-5 font-bold uppercase text-xs border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100">{isDownloading ? 'Generating...' : 'Preview PDF'}</button>
                    */}
                    </div> 
                   </div>
                 )
               )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="max-w-5xl mx-auto">
               <div className="flex justify-between items-center mb-10 border-b-2 border-black pb-4">
                  <h2 className="text-xl font-bold tracking-tight">Service Catalog</h2>
                  {catalog.length > 0 && (
                    <button onClick={() => {
                       const desc = prompt("Item Description:");
                       const rate = parseFloat(prompt("Base Rate:") || "0");
                       if(desc) {
                         const newItem: InvoiceItem = { id: Date.now().toString(), description: desc, rate, uom: 'NOS', qty: 1 };
                         handleSaveCatalogItem(newItem);
                       }
                    }} className="bg-black text-white px-8 py-3 border-2 border-black font-bold uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <Plus size={16} className="inline mr-2" /> Add Item
                    </button>
                  )}
               </div>
               {catalog.length === 0 ? (
                 <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                   <div className="text-center">
                     <Package size={64} className="mx-auto mb-4 text-gray-400" />
                     <h3 className="text-lg font-bold mb-2 tracking-tight">No Items Yet</h3>
                     <p className="text-gray-600 mb-6">Add your first service item to get started</p>
                     <button onClick={() => {
                        const desc = prompt("Item Description:");
                        const rate = parseFloat(prompt("Base Rate:") || "0");
                        if(desc) {
                          const newItem: InvoiceItem = { id: Date.now().toString(), description: desc, rate, uom: 'NOS', qty: 1 };
                          handleSaveCatalogItem(newItem);
                        }
                     }} className="bg-black text-white px-8 py-4 border-2 border-black font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                       <Plus size={20} className="inline mr-2" /> Add First Item
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                   <table className="w-full text-left border-collapse text-[11px] font-bold">
                     <thead className="bg-black text-white text-[9px]">
                       <tr><th className="p-4">Item Name</th><th className="p-4 text-right">Rate</th><th className="p-4 text-center">Action</th></tr>
                     </thead>
                     <tbody className="divide-y-2 divide-black/10">
                       {catalog.map(i => (
                         <tr key={i.id} className="hover:bg-slate-50">
                           <td className="p-4">{i.description}</td>
                           <td className="p-4 text-right">₹ {formatCurrency(i.rate)}</td>
                           <td className="p-4 text-center">
                              <button onClick={async () => { 
                                try {
                                  await catalogAPI.delete(i.id);
                                  setCatalog(catalog.filter(x => x.id !== i.id));
                                } catch (error) {
                                  console.error('Error deleting catalog item:', error);
                                }
                              }} className="text-red-500"><Trash2 size={16}/></button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-10 pb-20">
                <div className="bg-white p-10 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-bold text-sm mb-6 border-b-2 border-black pb-2 tracking-tight">Company Setup</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(profile); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyles}>Company Name</label>
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>Tagline</label>
                    <input
                      type="text"
                      value={profile.tagline || ''}
                      onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                      className={inputStyles}
                    />
                  </div>
                </div>
                <div className="max-w-2xl">
                  <label className={labelStyles}>Address</label>
                  <textarea
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className={inputStyles + " resize-none"}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyles}>GST No</label>
                    <input
                      type="text"
                      value={profile.gstNo || ''}
                      onChange={(e) => setProfile({ ...profile, gstNo: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>PAN No</label>
                    <input
                      type="text"
                      value={profile.panNo || ''}
                      onChange={(e) => setProfile({ ...profile, panNo: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyles}>Email</label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>Phone</label>
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyles}>State</label>
                    <input
                      type="text"
                      value={profile.state || ''}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>State Code</label>
                    <input
                      type="text"
                      value={profile.stateCode || ''}
                      onChange={(e) => setProfile({ ...profile, stateCode: e.target.value })}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={labelStyles}>CIN (Optional)</label>
                  <input
                    type="text"
                    value={profile.cin || ''}
                    onChange={(e) => setProfile({ ...profile, cin: e.target.value })}
                    className={inputStyles}
                  />
                </div>
                <div className="border-t-2 border-black pt-4">
                  <h3 className="text-lg font-bold mb-4 tracking-tight">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyles}>Bank Name</label>
                      <input
                        type="text"
                        value={profile.bankDetails?.bankName || ''}
                        onChange={(e) => setProfile({ ...profile, bankDetails: { ...(profile.bankDetails || { bankName: '', ifscCode: '', accountNo: '' }), bankName: e.target.value } })}
                        className={inputStyles}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>IFSC Code</label>
                      <input
                        type="text"
                        value={profile.bankDetails?.ifscCode || ''}
                        onChange={(e) => setProfile({ ...profile, bankDetails: { ...(profile.bankDetails || { bankName: '', ifscCode: '', accountNo: '' }), ifscCode: e.target.value } })}
                        className={inputStyles}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelStyles}>Account No</label>
                    <input
                      type="text"
                      value={profile.bankDetails?.accountNo || ''}
                      onChange={(e) => setProfile({ ...profile, bankDetails: { ...(profile.bankDetails || { bankName: '', ifscCode: '', accountNo: '' }), accountNo: e.target.value } })}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={labelStyles}>Text Case Preference</label>
                  <select
                    value={profile.textCase || 'normal'}
                    onChange={(e) => setProfile({ ...profile, textCase: e.target.value as 'uppercase' | 'normal' })}
                    className={inputStyles}
                  >
                    <option value="normal">Normal Case (Default)</option>
                    <option value="uppercase">UPPERCASE</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Controls how text is displayed throughout the application</p>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-black text-white px-8 py-3 border-2 border-black font-bold uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Save Company</button>
                </div>
              </form>
            </div>
            </div>
          )}
        </div>
      </main>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] flex flex-col border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center p-4 border-b-2 border-black bg-gray-50">
              <h3 className="font-bold uppercase text-sm tracking-widest">PDF Preview</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (pdfDataURL && currentInvoice) {
                      const link = document.createElement('a');
                      link.href = pdfDataURL;
                      link.download = `${currentInvoice.invoiceNo.replace(/\//g, '-')}.pdf`;
                      link.click();
                      addToast('success', 'PDF downloaded');
                    }
                  }}
                  className="bg-black text-white px-6 py-2 border-2 border-black font-bold uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800"
                >
                  Download
                </button>
                <button 
                  onClick={() => {
                    if (pdfDataURL && pdfDataURL.startsWith('blob:')) {
                      URL.revokeObjectURL(pdfDataURL);
                    }
                    setShowPDFPreview(false);
                    setPdfDataURL('');
                  }}
                  className="px-6 py-2 border-2 border-black font-bold uppercase text-[10px] hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100 p-4">
              {pdfDataURL ? (
                <embed
                  src={pdfDataURL}
                  type="application/pdf"
                  className="w-full h-full border-2 border-black"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading PDF...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
    )}
  </>
  );
};

export default App;
