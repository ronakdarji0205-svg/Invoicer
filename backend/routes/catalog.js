const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all catalog items
router.get('/', authenticateToken, (req, res) => {
  try {
    const catalog = db.prepare('SELECT * FROM catalog WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create catalog item
router.post('/', authenticateToken, (req, res) => {
  try {
    const { description, hsn, uom, rate } = req.body;

    const stmt = db.prepare(`
      INSERT INTO catalog (user_id, description, hsn, uom, rate)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.id, description, hsn, uom || 'NOS', rate);

    res.status(201).json({ id: result.lastInsertRowid, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update catalog item
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { description, hsn, uom, rate } = req.body;

    db.prepare(`
      UPDATE catalog SET description = ?, hsn = ?, uom = ?, rate = ?
      WHERE id = ? AND user_id = ?
    `).run(description, hsn, uom, rate, req.params.id, req.user.id);

    res.json({ message: 'Catalog item updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete catalog item
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM catalog WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Catalog item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;