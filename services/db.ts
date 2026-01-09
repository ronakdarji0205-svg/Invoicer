import Dexie, { Table } from 'dexie';
import { BusinessProfile, Client, Invoice, InvoiceItem, User } from '../types';

export class AppDatabase extends Dexie {
  profiles!: Table<BusinessProfile>;
  clients!: Table<Client>;
  invoices!: Table<Invoice>;
  catalog!: Table<InvoiceItem>;
  users!: Table<User>;

  constructor() {
    super('ProInvoicerDB');
    this.version(1).stores({
      profiles: '++id, name, gstNo',
      clients: '++id, name, gstNo',
      invoices: '++id, invoiceNo, invoiceDate, clientId',
      catalog: '++id, description, hsn',
      users: '++id, username'
    });
  }
}

export const db = new AppDatabase();

// Initialize with default data if empty
export const initializeDB = async () => {
  // No default profile, will be set during setup
};