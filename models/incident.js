const mongoose = require('mongoose');
const { Schema } = mongoose;

const incidentSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },  
  category: { type: String, enum: ['Hardware', 'Software', 'Network', 'Other'], required: true },  
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  comments: { type: String } // Notes on how the incident was resolved
}, { timestamps: true });

module.exports = mongoose.model('incidents', incidentSchema);
