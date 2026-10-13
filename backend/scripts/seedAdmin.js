require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  if (!(await User.findOne({ email }))) {
    await User.create({ name: 'Admin', email, password, role: 'Admin' }); // relies on your pre-save hash
  }
  await mongoose.disconnect();
})();