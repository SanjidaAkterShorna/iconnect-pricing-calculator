const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const Client = require('../models/Client');

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await Client.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const client = await Client.create({ name, email, password, company: company || '' });
    const token = jwt.sign(
      { id: client._id, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, name: client.name, email: client.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await Client.findOne({ email: email.toLowerCase() });
    if (!client || !(await client.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: client._id, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, name: client.name, email: client.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token (used by client pages to check auth)
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'client') {
      return res.status(403).json({ error: 'Not a client account' });
    }
    // Admin preview mode — return a mock client object
    if (decoded.isAdminPreview) {
      return res.json({ _id: decoded.id, name: 'Admin (Preview)', email: 'admin@preview', company: 'Admin Preview' });
    }
    const client = await Client.findById(decoded.id).select('-password');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'client' || decoded.isAdminPreview) return res.status(403).json({ error: 'Forbidden' });
    const { name, company } = req.body;
    const client = await Client.findByIdAndUpdate(decoded.id, { name, company }, { new: true }).select('-password');
    res.json(client);
  } catch { res.status(500).json({ error: 'Failed to update profile' }); }
});

// Change password
router.put('/change-password', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'client' || decoded.isAdminPreview) return res.status(403).json({ error: 'Forbidden' });
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const client = await Client.findById(decoded.id);
    if (!(await client.comparePassword(currentPassword))) return res.status(400).json({ error: 'Current password is incorrect' });
    client.password = newPassword;
    await client.save();
    res.json({ message: 'Password changed successfully' });
  } catch { res.status(500).json({ error: 'Failed to change password' }); }
});

// Forgot password — generate reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const client = await Client.findOne({ email: email.toLowerCase() });
    if (!client) return res.status(404).json({ error: 'No account found with that email' });

    const token = crypto.randomBytes(32).toString('hex');
    client.resetToken = token;
    client.resetExpires = new Date(Date.now() + 3600000); // 1 hour
    await client.save();

    // In production, send email with reset link. For now, return the token.
    const resetUrl = `/reset-password.html?token=${token}`;
    res.json({ message: 'Password reset link generated', resetUrl });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid token and password (min 6 chars) required' });
    }
    const client = await Client.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
    if (!client) return res.status(400).json({ error: 'Invalid or expired reset token' });

    client.password = newPassword;
    client.resetToken = null;
    client.resetExpires = null;
    await client.save();
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
