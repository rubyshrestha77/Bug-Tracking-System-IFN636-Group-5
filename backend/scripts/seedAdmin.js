require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.set('strictQuery', true); // silences the deprecation warning

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@demo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';

(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    // Backfill existing users that predate the isActive field
    const result = await User.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
    );
    console.log(`Backfilled isActive on ${result.modifiedCount} users`);

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
        await User.create({ name: 'Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
        console.log(`Admin created: ${ADMIN_EMAIL}`);
    } else {
        // Make sure this account is an active admin with the configured password
        existing.role = 'admin';
        existing.isActive = true;
        existing.password = ADMIN_PASSWORD; // hashed by the model's pre-save hook
        await existing.save();
        console.log(`Admin updated: ${ADMIN_EMAIL} (role, active status and password reset)`);
    }
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });