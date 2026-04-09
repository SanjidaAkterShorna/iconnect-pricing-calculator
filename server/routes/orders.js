const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Client middleware — verify client token
function clientAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'client') {
      return res.status(403).json({ error: 'Not a client account' });
    }
    req.clientId = decoded.id;
    req.isAdminPreview = decoded.isAdminPreview || false;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// CLIENT — submit an order
router.post('/', clientAuth, async (req, res) => {
  try {
    if (req.isAdminPreview) {
      return res.status(400).json({ error: 'Cannot place orders in admin preview mode' });
    }

    const {
      planKey, planName, planMinutes, monthlyPrice, setupFee, overageRate,
      monthlyAddOns, oneTimeAddOns, monthlyTotal, oneTimeTotal,
      clientName, clientEmail
    } = req.body;

    const order = await Order.create({
      client: req.clientId,
      clientName,
      clientEmail,
      planKey,
      planName,
      planMinutes,
      monthlyPrice,
      setupFee,
      overageRate,
      monthlyAddOns: monthlyAddOns || [],
      oneTimeAddOns: oneTimeAddOns || [],
      monthlyTotal,
      oneTimeTotal,
      status: 'pending'
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit order', details: err.message });
  }
});

// CLIENT — get my orders
router.get('/my', clientAuth, async (req, res) => {
  try {
    const orders = await Order.find({ client: req.clientId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ADMIN — get all orders
router.get('/all', auth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('client', 'name email company');
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ADMIN — update order status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
