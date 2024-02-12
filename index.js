const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const dotenv = require('dotenv');
dotenv.config({ path: '../sample.env' });
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {type: String, required: true},
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  _id: {type: String, required: true},
  username: {type: String, required: true},
  log: [{description: {type: String, required: true}, 
        duration: {type: Number, required: true},
        date: {type: Date, default: Date.now}}],
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', async (req, res, next) => {
  try {
    const username = req.body.username;
    if (username) {
      const newUser = new User({username: username});
      res.json({username: newUser.username, _id: newUser._id});
      await newUser.save();
    } else {res.send('Enter a username')};
  } catch (error) {
      return next(error);
  }
});
app.get('/api/users', async (req, res, next) => {
  try {
    let user = await User.find({});
    user? res.json(user) : res.send('No users registered in db');
  } catch (error) {
      return next(error);
  }
});

app.post('/api/users/:_id/exercises', async (req, res, next) => {
  try {
    const id = req.params._id;
    const description = req.body.description;
    const duration = req.body.duration;
    const date = req.body.date? new Date(req.body.date.replaceAll('-', ',')) : new Date();
    const users = await User.findById(id);
    const exercises = await Exercise.findById(id);
    if (users != null && exercises == null) {
      let log = [];
      log.push({description: description, duration: duration, date: date.toDateString()});
      const newExercise = new Exercise({
        _id: id,
        username: users.username,
        log: log
      });
      res.json({
        username: users.username,
        description: description,
        duration: duration,
        date: date.toDateString(),
        _id: id
      });
      newExercise.save();
    } 
    if (users != null && exercises != null) {
      exercises.log.push({description: description, duration: duration, date: date.toDateString()});
      const updateExercise = await Exercise.findByIdAndUpdate(id, {log: exercises.log});
      res.json({
        username: users.username,
        description: description,
        duration: duration,
        date: date.toDateString(),
        _id: id
      });
      updateExercise.save();
    } 
    else {res.send('No username found in Users database')};
  } catch (error) {
      return next(error);
    };
});

app.get('/api/users/:_id/logs?', async (req, res, next) => {
  try {
    let id = req.params._id;
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit;
    let user = await User.findById(id);
    if (user) {
      let exercises = await Exercise.findById(id);
      if (from) {
        let fromDate = new Date(from);
        exercises.log.filter(item => {
          let itemDate = new Date(item.date);
          return itemDate >= fromDate;
        });
      };
      if (to) {
        let toDate = new Date(to);
        exercises.log.filter(item => {
          let itemDate = new Date(item.date);
          return itemDate <= toDate;
        });
      };
      if (limit < exercises.log.length) {
        exercises.log = exercises.log.slice(0, limit);
      };
      res.json({ username: user.username, count: exercises.log.length, _id: id, log: exercises.log});
    } else {res.send('No user found in Users database')};
  } catch (error) {
      return next(error);
  }
});


app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});