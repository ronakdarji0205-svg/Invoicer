const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get profile
router.get('/', authenticateToken, (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create/Update profile
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      name, tagline, address, gstNo, panNo, email, phone, logo, cin, state, stateCode,
      bankName, ifscCode, accountNo
    } = req.body;

    // Check if profile exists
    const existing = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(req.user.id);

    if (existing) {
      // Update
      db.prepare(`
        UPDATE profiles SET
          name = ?, tagline = ?, address = ?, gst_no = ?, pan_no = ?, email = ?, phone = ?,
          logo = ?, cin = ?, state = ?, state_code = ?, bank_name = ?, ifsc_code = ?, account_no = ?
        WHERE user_id = ?
      `).run(name, tagline, address, gstNo, panNo, email, phone, logo, cin, state, stateCode,
             bankName, ifscCode, accountNo, req.user.id);
    } else {
      // Insert
      db.prepare(`
        INSERT INTO profiles (user_id, name, tagline, address, gst_no, pan_no, email, phone,
                              logo, cin, state, state_code, bank_name, ifsc_code, account_no)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, name, tagline, address, gstNo, panNo, email, phone, logo, cin, state, stateCode,
             bankName, ifscCode, accountNo);
    }

    res.json({ message: 'Profile saved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;