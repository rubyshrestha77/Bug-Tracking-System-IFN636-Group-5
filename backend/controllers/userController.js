const User = require('../models/User');
const { PUBLIC_USER_FIELDS } = require('../models/userFields');

exports.listUsers = async (req, res) => {
  const users = await User.find().select(PUBLIC_USER_FIELDS).sort({ createdAt: 1 });
  res.json(users);
};