const express = require('express');
const router = express.Router();
const Incident = require('../models/incident'); // Ensure correct model path
const User = require('../models/user');
const sendMail = require('../mailer');
const ChangeRequest = require('../models/changerequests');
const Task = require('../models/task');  


router.post('/create', async (req, res) => {
  console.log(req.body);
  try {
    const { title, description, priority, category, createdBy,comments } = req.body;

    if (!title || !description || !priority || !category || !createdBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newIncident = new Incident({
      title,
      description,
      priority,
      category,
      status: 'Open', // Default status
      comments,
      createdBy
    });

    let assignedSupport = null;

    const leastBusySupportMember = await User.aggregate([
      { $match: { role: 'Support' } },
      {
        $lookup: {
          from: 'incidents', // Ensure this matches the actual collection name in DB
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'assignedIncidents'
        }
      },
      {
        $addFields: {
          openIncidents: {
            $size: {
              $filter: {
                input: '$assignedIncidents',
                as: 'incident',
                cond: { $in: ['$$incident.status', ['Pending', 'In Progress','Open']] }
              }
            }
          }
        }
      },
      { $sort: { openIncidents: 1 } }
    ]);
    // console.log(leastBusySupportMember)
    

    if (leastBusySupportMember.length > 0) {
      newIncident.assignedTo = leastBusySupportMember[0]._id;
      assignedSupport = leastBusySupportMember[0];
    }

    await newIncident.save();

    const user = await User.findById(createdBy);
    
    if (user) {
      await sendMail(user.email, 'Incident Created', `Your incident "${title}" has been logged.`);
    }
    if (assignedSupport) {
      await sendMail(assignedSupport.email, 'New Incident Assigned', `An incident "${title}" has been assigned to you.`);
    }

    res.status(201).json({ message: 'Incident created and email sent', incident: newIncident });

  } catch (error) {
    console.error('Error creating incident:', error); // Improved logging
    res.status(500).json({ error: error.message || 'Error creating incident' });
  }
});

// Get all incidents
router.get('/incidents', async (req, res) => {
  const i=await Incident.find()
  console.log(i)
  try {
    const incidents = await Incident.find()

    res.status(200).json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);  // Logs the actual error
    res.status(500).json({ error: error.message });      // Sends error details in response
  }
});
router.get('/getincident/:id', async (req, res) => {
  try {
      const userId =  req.params.id;
      console.log(userId)

      const incidents = await Incident.find({ createdBy: userId });

      res.status(200).json(incidents);
  } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});
router.get('/getinc/:id', async (req, res) => {
  try {
      const userId =  req.params.id;
      console.log(userId)

      const incidents = await Incident.find({ assignedTo: userId.replace(':','') });
    console.log(incidents)
      res.status(200).json(incidents);
  } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});

router.patch('/incidents/:id', async (req, res) => {
  try {
      const { status, comment } = req.body;
      const incidentId = req.params.id;

      // Find the Incident
      const incident = await Incident.findById(incidentId);
      if (!incident) {
          return res.status(404).json({ error: 'Incident not found' });
      }

      // Update Status & Comments
      if (status) incident.status = status;
      if (comment){
        if (!incident.comments) {
            incident.comments = ['']; // Ensure comments exists
        }
        // incident.comments = ['Okay'];
        console.log(incident.createdBy.email);
        incident.comments=comment;
      }
      await incident.save();

      // Notify User via Email
      const user=await User.findById(incident.createdBy)
      if (user) {
          const emailText = `Your incident ticket has been updated.\n\nStatus: ${status}\nComment: ${comment}`;
          await sendMail(user.email, `Incident Update: ${incident.title}`, emailText);
      }

      res.status(200).json({ message: 'Incident updated successfully', incident });
  } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});




//Change Requests 

// Create a Change Request with tasks
router.post('/changerequests', async (req, res) => {
  try {
    const { title, description, urgency, category, fromDate, toDate, createdBy, tasks } = req.body;

    // Create Change Request
    const newChangeRequest = new ChangeRequest({
      title,
      description,
      urgency,
      category,
      fromDate,
      toDate,
      createdBy
    });

    await newChangeRequest.save();

    // Assign tasks
    // console.log(tasks)
    
    const createdTasks = await Promise.all(tasks.map(async (taskData) => {
      // Auto-assign least busy support staff
      const leastBusySupport = await User.aggregate([
        { $match: { role: 'Support' } },
        {
          $lookup: {
            from: 'tasks',
            localField: '_id',
            foreignField: 'assignedTo',
            as: 'assignedTasks'
          }
        },
        {
          $addFields: {
            openTasks: {
              $size: {
                $filter: {
                  input: '$assignedTasks',
                  as: 'task',
                  cond: { $in: ['$$task.status', ['Pending', 'In Progress']] }
                }
              }
            }
          }
        },
        { $sort: { openTasks: 1 } },
        { $limit: 1 }
      ]);

      const assignedTo = leastBusySupport.length > 0 ? leastBusySupport[0]._id : null;

      const newTask = new Task({
        title: taskData.title,
        description: taskData.description,
        status: 'Pending',
        assignedTo,
        changeRequest: newChangeRequest._id,
        dueDate: taskData.dueDate
      });

      await newTask.save();

      // If task is assigned, send an email notification
    
      // Ensure assignedTo is not null before querying the user
      if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        const mail=assignedUser.email
        
        if (mail) { // Check if email exists
          console.log(mail)
          await sendMail(mail, `New Task Assigned: "${taskData.title}"`,
             `Hello "${assignedUser.userName}",\n\nYou have been assigned a new task:\n\nTitle: "${taskData.title}"\nDescription: "${taskData.description}"\nDue Date: "${new Date(taskData.dueDate).toDateString()}"\n\nPlease log in to view more details.\n\nThanks,\nSupport Team`);
        } else {
          console.error("❌ No valid email found for assigned user.");
        }
      } else {
        console.error("❌ No support staff available for assignment.");
      }


      return newTask._id;
    }));


    // Update Change Request with tasks
    newChangeRequest.tasks = createdTasks;
    await newChangeRequest.save();

    res.status(201).json({ message: 'Change Request and tasks created successfully', changeRequest: newChangeRequest });
  } catch (error) {
    console.error('Error creating Change Request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get CR
router.get('/changerequests', async (req, res) => {
  try {
    const changeRequests = await ChangeRequest.find()
      // .populate('createdBy', 'userName email') // Populate created user details
      // .populate({
      //   path: 'tasks',
      //   populate: { path: 'assignedTo', select: 'userName email' } // Populate task assignments
      // });

    res.status(200).json(changeRequests);
  } catch (error) {
    console.error('Error fetching Change Requests:', error);
    res.status(500).json({ error: error.message });
  }
});
router.get('/changerequests/:id', async (req, res) => {
  const userId = req.params.id.replace(":", "");;
  try {
    const changeRequest = await ChangeRequest.find({ createdBy: userId })
    if (!changeRequest) {
      return res.status(404).json({ message: 'ChangeRequest not found' });
    }

    res.status(200).json(changeRequest);
  } catch (error) {
    console.error('Error fetching Change Request by ID:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
      const { status, comment } = req.body;
      const taskId = req.params.id.replace(":", ""); // ✅ Fix extra colon issue

      // Find the Task
      const task = await Task.findById(taskId);
      // console.log(task)
      if (!task) {
          return res.status(404).json({ error: 'Task not found' });
      }

      // Find the Change Request containing the Task
      const changeRequest = await ChangeRequest.findById(task.changeRequest);
      if (!changeRequest) {
          return res.status(404).json({ error: 'Change Request not found' });
      }

      // Update Task Status
      if (status) task.status = status;

      // Store Comment Separately in Change Request
      if (comment){
        if (!changeRequest.comments) {
            changeRequest.comments = ['']; // Ensure comments exists
        }
        // incident.comments = ['Okay'];
          // changeRequest.comments = changeRequest.comments || []; // Ensure array exists
          changeRequest.comments=comment ;
      }
      // console.log(changeRequest)

      await changeRequest.save();

      // Notify Change Request Owner via Email
      const user = await User.findById(changeRequest.createdBy);
      console.log(user)
      if (user && user.email) {
          const emailText = `A task in your Change Request has been updated.\n\nTask: ${task.title}\nStatus: ${status}\nComment: ${comment}`;
          await sendMail(user.email, `Task Update: ${task.title}`, emailText);
      }

      res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/tasks/get/:userId', async (req, res) => {
  try {
    const userId = req.params.userId.replace(":",''); 

    // Find tasks assigned to the given user
    const tasks = await Task.find({ assignedTo: userId });

    if (!tasks || tasks.length === 0) {
      return res.json({ message: 'No tasks assigned to this user' });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.put('/assign/:ticketId', async (req, res) => {
  try {
      const { assignedTo } = req.body;
      const ticket = await Ticket.findByIdAndUpdate(req.params.ticketId, { assignedTo }, { new: true });

      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      // Fetch user and assigned support details
      const supportMember = await User.findById(assignedTo);
      const user = await User.findById(ticket.user);

      if (supportMember) {
          await sendMail(supportMember.email, 'Ticket Assigned', `You have been assigned the ticket "${ticket.title}".`);
      }
      if (user) {
          await sendMail(user.email, 'Ticket Update', `Your ticket "${ticket.title}" has been assigned to a support staff.`);
      }

      res.status(200).json({ message: 'Ticket assigned successfully and email sent', ticket });
  } catch (error) {
      res.status(500).json({ error: 'Error assigning ticket' });
  }
});
  
  router.get('/user/:userId', async (req, res) => {
    try {
      const tickets = await Ticket.find({ user: req.params.userId }).populate('assignedTo', 'name');
      res.status(200).json(tickets);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tickets' });
    }
  });

  
  router.get('/assigned/:supportId', async (req, res) => {
    try {
      const tickets = await Ticket.find({ assignedTo: req.params.supportId }).populate('user', 'name');
      res.status(200).json(tickets);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tickets' });
    }
  });

  router.get('/all', async (req, res) => {
    try {
      const tickets = await Ticket.find().populate('user', 'name').populate('assignedTo', 'name');
      res.status(200).json(tickets);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tickets' });
    }
  });
  
  // Unified Update API for both Incidents & Change Requests
  router.put('/update/:ticketId', async (req, res) => {
    try {
        const { status, comment } = req.body;

        const ticket = await Ticket.findById(req.params.ticketId).populate('user assignedTo');
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        ticket.status = status;
        if (comment) {
            ticket.comments.push({ text: comment, date: new Date() });
        }

        await ticket.save();

        // Send email notifications to both user and assigned support
        if (ticket.user) {
            await sendMail(ticket.user.email, 'Ticket Updated', `Your ticket "${ticket.title}" has been updated to "${status}".`);
        }
        if (ticket.assignedTo) {
            await sendMail(ticket.assignedTo.email, 'Ticket Update', `The ticket "${ticket.title}" assigned to you has been updated to "${status}".`);
        }

        res.status(200).json({ message: 'Ticket updated successfully and email sent', ticket });
    } catch (error) {
        res.status(500).json({ error: 'Error updating ticket' });
    }
});

  

  router.put('/change-request/approve/:ticketId', async (req, res) => {
    try {
      const { status, reviewedBy } = req.body; // reviewedBy = Admin/Manager ID
  
      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status update' });
      }
  
      const ticket = await Ticket.findById(req.params.ticketId);
      if (!ticket || ticket.type !== 'ChangeRequest') {
        return res.status(404).json({ error: 'Change Request not found' });
      }
  
      // Update status and set reviewer
      ticket.status = status;
      ticket.reviewedBy = reviewedBy;
  
      await ticket.save();
      res.status(200).json({ message: `Change Request ${status.toLowerCase()} successfully`, ticket });
    } catch (error) {
      res.status(500).json({ error: 'Error updating Change Request status' });
    }
  });
  
module.exports = router;
