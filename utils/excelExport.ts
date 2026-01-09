
import * as XLSX from 'xlsx';
import { BusinessProfile, Client, Invoice } from '../types';

export const exportAppStateToExcel = (
  profile: BusinessProfile,
  clients: Client[],
  invoices: Invoice[]
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Company Profile
  const profileData = [
    { Field: 'Company Name', Value: profile.name },
    { Field: 'Address', Value: profile.address },
    { Field: 'GSTIN', Value: profile.gstNo },
    { Field: 'PAN', Value: profile.panNo },
    { Field: 'Email', Value: profile.email },
    { Field: 'Phone', Value: profile.phone },
    { Field: 'Bank Name', Value: profile.bankDetails?.bankName || '' },
    { Field: 'A/c No', Value: profile.bankDetails?.accountNo || '' },
    { Field: 'IFSC', Value: profile.bankDetails?.ifscCode || '' },
    { Field: 'State', Value: profile.state },
    { Field: 'State Code', Value: profile.stateCode },
  ];
  const profileWs = XLSX.utils.json_to_sheet(profileData);
  XLSX.utils.book_append_sheet(wb, profileWs, 'Profile');

  // Sheet 2: Vendors
  const vendorsData = clients.map(c => ({
    ID: c.id,
    Name: c.name,
    GSTIN: c.gstNo,
    PAN: c.pan,
    State: c.state,
    StateCode: c.stateCode,
    Address: c.address,
    WorkOrdersCount: c.workOrders?.length || 0
  }));
  const vendorsWs = XLSX.utils.json_to_sheet(vendorsData);
  XLSX.utils.book_append_sheet(wb, vendorsWs, 'Vendors');

  // Sheet 3: Work Orders & Line Items
  const woItems: any[] = [];
  clients.forEach(c => {
    c.workOrders?.forEach(wo => {
      wo.items.forEach(item => {
        woItems.push({
          Vendor: c.name,
          WONumber: wo.number,
          WODate: wo.date,
          Description: item.description,
          HSN: item.hsn,
          Qty: item.qty,
          UoM: item.uom,
          Rate: item.rate,
          Total: item.qty * item.rate
        });
      });
    });
  });
  const woWs = XLSX.utils.json_to_sheet(woItems);
  XLSX.utils.book_append_sheet(wb, woWs, 'WorkOrderItems');

  // Sheet 4: Invoice Ledger
  const ledgerData = invoices.map(inv => {
    const subTotal = inv.items.reduce((a, b) => a + (b.qty * b.rate), 0);
    return {
      InvoiceNo: inv.invoiceNo,
      Date: inv.invoiceDate,
      Vendor: inv.client.name,
      WONumber: inv.workOrderNo,
      SubTotal: subTotal,
      CGST: inv.cgstRate,
      SGST: inv.sgstRate,
      IGST: inv.igstRate,
      Status: inv.isPaid ? 'PAID' : 'PENDING'
    };
  });
  const ledgerWs = XLSX.utils.json_to_sheet(ledgerData);
  XLSX.utils.book_append_sheet(wb, ledgerWs, 'Invoices');

  // Generate and download
  XLSX.writeFile(wb, `Pramukh_ERP_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
};
