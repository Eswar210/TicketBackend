const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true},
  email: { type: String, required: true, unique: true,},
  role: { type: String, enum: ['EndUser', 'Support', 'Administrator'], default: 'EndUser', required: true},
  password: { type: String, required: true}
}, { timestamps: true });

module.exports = mongoose.model('users', userSchema);
