const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional
  changeRequest: { type: Schema.Types.ObjectId, ref: 'ChangeRequest', required: true }, // Links to Change Request
  dueDate: { type: Date, required: true, validate: { 
    validator: async function(value) {
      const changeRequest = await mongoose.model('ChangeRequest').findById(this.changeRequest);
      return changeRequest ? value <= changeRequest.toDate : false;
    },
    message: 'dueDate must be less than or equal to toDate of the associated Change Request'
  } }
}, { timestamps: true });

module.exports=mongoose.model('Tasks',TaskSchema)  