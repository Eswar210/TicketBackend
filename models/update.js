const mongoose = require('mongoose');

const updateSchema = new Schema({
    ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'] },
    comment: { type: String, required: true }
  }, { timestamps: true });
  
module.exports = mongoose.model('updates', updateSchema);