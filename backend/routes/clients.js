const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all clients (including work orders)
router.get('/', authenticateToken, (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    const stmt = db.prepare('SELECT * FROM work_orders WHERE client_id = ? ORDER BY created_at DESC');
    const enhanced = clients.map(c => {
      const wos = stmt.all(c.id).map(w => ({ id: w.id, number: w.number, date: w.date, items: w.items ? JSON.parse(w.items) : [] }));
      return { 
        ...c, 
        gstNo: c.gst_no, 
        stateCode: c.state_code,
        workOrders: wos 
      };
    });
    res.json(enhanced);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create client
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, address, gstNo, state, stateCode, pan, email, phone } = req.body;

    const stmt = db.prepare(`
      INSERT INTO clients (user_id, name, address, gst_no, state, state_code, pan, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.id, name, address, gstNo, state, stateCode, pan, email, phone);

    // Insert any provided work orders
    if (Array.isArray(req.body.workOrders) && req.body.workOrders.length > 0) {
      const insertWO = db.prepare('INSERT INTO work_orders (client_id, number, date, items) VALUES (?, ?, ?, ?)');
      req.body.workOrders.forEach(wo => {
        insertWO.run(result.lastInsertRowid, wo.number || '', wo.date || '', wo.items ? JSON.stringify(wo.items) : null);
      });
    }

    // Return created client with workOrders
    const createdClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    const wos = db.prepare('SELECT * FROM work_orders WHERE client_id = ? ORDER BY created_at DESC').all(createdClient.id).map(w => ({ id: w.id, number: w.number, date: w.date, items: w.items ? JSON.parse(w.items) : [] }));

    res.status(201).json({ 
      ...createdClient, 
      gstNo: createdClient.gst_no, 
      stateCode: createdClient.state_code,
      workOrders: wos 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update client
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, address, gstNo, state, stateCode, pan, email, phone } = req.body;

    db.prepare(`
      UPDATE clients SET name = ?, address = ?, gst_no = ?, state = ?, state_code = ?, pan = ?, email = ?, phone = ?
      WHERE id = ? AND user_id = ?
    `).run(name, address, gstNo, state, stateCode, pan, email, phone, req.params.id, req.user.id);

    // Replace work orders for client (simple approach: delete all then insert new)
    if (Array.isArray(req.body.workOrders)) {
      db.prepare('DELETE FROM work_orders WHERE client_id = ?').run(req.params.id);
      const insertWO = db.prepare('INSERT INTO work_orders (client_id, number, date, items) VALUES (?, ?, ?, ?)');
      req.body.workOrders.forEach(wo => {
        insertWO.run(req.params.id, wo.number || '', wo.date || '', wo.items ? JSON.stringify(wo.items) : null);
      });
    }

    const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    const wos = db.prepare('SELECT * FROM work_orders WHERE client_id = ? ORDER BY created_at DESC').all(updatedClient.id).map(w => ({ id: w.id, number: w.number, date: w.date, items: w.items ? JSON.parse(w.items) : [] }));

    res.json({ 
      message: 'Client updated', 
      ...updatedClient, 
      gstNo: updatedClient.gst_no, 
      stateCode: updatedClient.state_code,
      workOrders: wos 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete client
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM work_orders WHERE client_id = ?').run(req.params.id);
    db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Work order endpoints (optional): delete single WO
router.delete('/:id/workorders/:woId', authenticateToken, (req, res) => {
  try {
    // ensure client belongs to user
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    db.prepare('DELETE FROM work_orders WHERE id = ? AND client_id = ?').run(req.params.woId, req.params.id);
    res.json({ message: 'Work order deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workorder for a client
router.post('/:id/workorders', authenticateToken, (req, res) => {
  try {
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { number, date, items } = req.body;
    const stmt = db.prepare('INSERT INTO work_orders (client_id, number, date, items) VALUES (?, ?, ?, ?)');
    const r = stmt.run(req.params.id, number || '', date || '', items ? JSON.stringify(items) : null);
    const wo = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json({ id: wo.id, number: wo.number, date: wo.date, items: wo.items ? JSON.parse(wo.items) : [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update workorder
router.put('/:id/workorders/:woId', authenticateToken, (req, res) => {
  try {
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { number, date, items } = req.body;
    db.prepare('UPDATE work_orders SET number = ?, date = ?, items = ? WHERE id = ? AND client_id = ?')
      .run(number || '', date || '', items ? JSON.stringify(items) : null, req.params.woId, req.params.id);

    const wo = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(req.params.woId);
    res.json({ id: wo.id, number: wo.number, date: wo.date, items: wo.items ? JSON.parse(wo.items) : [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;