var express = require('express');
var router = express.Router();
var User=require('../models/user')
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Incident=require("../models/incident")

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.post('/register', async (req, res) => {
  try {
    const { userName, email, role, password } = req.body;
    // console.log('o')
    var newpassword= await bcrypt.hash(password, 10);
    const newUser = new User({ userName, email, role, password:newpassword });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async(req,res)=>{

  //login api
  try{
    const {userName, password} = req.body;
    await User.findOne({userName:userName}).then((user)=>{
      if(user){
        bcrypt.compare(password, user.password, (err, result)=>{
          if(result){
            res.status(200).json({message: "Login Successful", user: user});
          }
          else{
            res.status(400).json({message: "Login Failed"});
          }
        });
      }
      else{
        res.status(400).json({message: "User not found"});
      }
    })

  }
  catch(error){
    res.status(500).json({error: error.message});
  }
})

router.get("/get", async (req, res) => {
  User.find().then((users) => {
    res.status(200).json(users);
  })
})
router.get('/getincident/:id', async (req, res) => {
  try {
      let userId = req.params.id;

      // Ensure userId is valid and remove any leading colons
      userId = userId.replace(/^:/, ''); 

      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({ error: 'Invalid User ID' });
      }

      const incidents = await Incident.find({ createdBy: userId });

      res.status(200).json(incidents);
  } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
