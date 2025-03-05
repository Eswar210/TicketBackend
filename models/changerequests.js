const mongoose = require('mongoose');
const { Schema } = mongoose;
const Task = require('./task');  // ✅ Ensure this matches the actual file name

const changeRequestSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  urgency: { type: String, enum: ['Low', 'Medium', 'High'], required: true },  
  category: { type: String, enum: ['UI/UX', 'Feature Update', 'Bug Fix', 'Other'], required: true },  
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Completed'], default: 'Pending' },
  fromDate: { type: Date, required: true },  
  toDate: { 
    type: Date, 
    required: true, 
    validate: { 
      validator: function(value) {
        return this.fromDate <= value;  // Ensures toDate is after fromDate
      },
      message: 'toDate must be after fromDate'
    }
  },  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comments: [{ type:String }], // Supports multiple comments
  tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }] // Links to related tasks
}, { timestamps: true });

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
