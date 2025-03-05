const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  type: { type: String, enum: ['Incident', 'ChangeRequest'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'] },
  category: { type: String }, // Only for Incident Tickets
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  impactAssessment: { type: String }, // Only for Change Requests
  tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }], // Only for Change Requests
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  comments: [{ text: String, date: Date }],
}, { timestamps: true });

module.exports = mongoose.model('tickets', ticketSchema);
