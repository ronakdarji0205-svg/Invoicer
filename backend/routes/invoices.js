const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all invoices
router.get('/', authenticateToken, (req, res) => {
  try {
    const invoices = db.prepare(`
      SELECT i.*, 
             c.id as client_id, c.name as client_name, c.address as client_address,
             c.gst_no as client_gst_no, c.state as client_state, c.state_code as client_state_code,
             c.pan as client_pan, c.email as client_email, c.phone as client_phone
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.updated_at DESC
    `).all(req.user.id);

    // Parse items JSON and reconstruct client object
    const parsedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNo: inv.invoice_no,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      workOrderNo: inv.work_order_no,
      workOrderDate: inv.work_order_date,
      hsnCode: inv.hsn_code,
      cgstRate: inv.cgst_rate,
      sgstRate: inv.sgst_rate,
      igstRate: inv.igst_rate,
      discount: inv.discount,
      isPaid: inv.is_paid === 1,
      notes: inv.notes,
      updatedAt: inv.updated_at,
      items: JSON.parse(inv.items),
      client: {
        id: inv.client_id,
        name: inv.client_name,
        address: inv.client_address,
        gstNo: inv.client_gst_no,
        state: inv.client_state,
        stateCode: inv.client_state_code,
        pan: inv.client_pan,
        email: inv.client_email,
        phone: inv.client_phone
      }
    }));

    res.json(parsedInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create invoice
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      invoiceNo, invoiceDate, dueDate, workOrderNo, workOrderDate, hsnCode,
      clientId, items, cgstRate, sgstRate, igstRate, discount, isPaid, notes
    } = req.body;

    const itemsJson = JSON.stringify(items);

    const stmt = db.prepare(`
      INSERT INTO invoices (user_id, invoice_no, invoice_date, due_date, work_order_no, work_order_date,
                           hsn_code, client_id, items, cgst_rate, sgst_rate, igst_rate, discount, is_paid, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.id, invoiceNo, invoiceDate, dueDate, workOrderNo, workOrderDate,
                           hsnCode, clientId, itemsJson, cgstRate, sgstRate, igstRate, discount, isPaid ? 1 : 0, notes);

    res.status(201).json({ id: result.lastInsertRowid, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update invoice
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const {
      invoiceNo, invoiceDate, dueDate, workOrderNo, workOrderDate, hsnCode,
      clientId, items, cgstRate, sgstRate, igstRate, discount, isPaid, notes
    } = req.body;

    const itemsJson = JSON.stringify(items);

    db.prepare(`
      UPDATE invoices SET invoice_no = ?, invoice_date = ?, due_date = ?, work_order_no = ?, work_order_date = ?,
                         hsn_code = ?, client_id = ?, items = ?, cgst_rate = ?, sgst_rate = ?, igst_rate = ?,
                         discount = ?, is_paid = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(invoiceNo, invoiceDate, dueDate, workOrderNo, workOrderDate, hsnCode, clientId, itemsJson,
           cgstRate, sgstRate, igstRate, discount, isPaid ? 1 : 0, notes, req.params.id, req.user.id);

    res.json({ message: 'Invoice updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;