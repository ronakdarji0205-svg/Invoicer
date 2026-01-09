
export interface User {
  id: string;
  username: string;
  password: string;
}

export interface BankDetails {
  bankName: string;
  ifscCode: string;
  accountNo: string;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  address: string;
  gstNo: string;
  panNo: string;
  email: string;
  phone: string;
  bankDetails: BankDetails;
  logo: string; // Base64
  cin?: string;
  state: string;
  stateCode: string;
  textCase?: 'uppercase' | 'normal';
} 

export interface WorkOrder {
  id: string;
  number: string;
  date: string;
  items: InvoiceItem[];
}

export interface Client {
  id: string;
  name: string;
  address: string;
  gstNo: string;
  state: string;
  stateCode: string;
  pan?: string;
  email?: string;
  phone?: string;
  workOrders?: WorkOrder[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsn?: string;
  uom: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  workOrderNo?: string;
  workOrderDate?: string;
  hsnCode?: string;
  client: Client;
  items: InvoiceItem[];
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  discount: number;
  isPaid: boolean;
  notes?: string;
  updatedAt: string;
}
