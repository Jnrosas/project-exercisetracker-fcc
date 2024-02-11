const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv');
dotenv.config({ path: '../sample.env' });
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

let port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({extended: false}));
app.use(cors())

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(express.static('public'))

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
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now},
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', (req, res) => {
  const username = req.body.username;
  const newUser = new User({username: username});
  res.json({username: newUser.username, _id: newUser._id});
  newUser.save();
});
app.get('/api/users', async (req, res) => {
  let user = await User.find({});
  res.json(user);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date? new Date(req.body.date) : new Date();
  const username = await User.findById(id);
  const newExercise = new Exercise({
    _id: id,
    username: username.username,
    description: description,
    duration: duration,
    date: date
  });
  res.json({
    username: username.username,
    description: description,
    duration: duration,
    date: date.toDateString(),
    _id: id
  });
  newExercise.save();
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let id = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  let user = await User.findById(id);
  let exercises = await Exercise.find({_id: id});
  let log = [];
  for (let i = 0; i < exercises.length; i++) {
    log.push({description: exercises[i].description, duration: exercises[i].duration, date: exercises[i].date.toDateString()});
  };
  if (from) {
    let fromDate = new Date(from);
    log = log.filter(item => {
      let itemDate = new Date(item.date);
      return itemDate >= fromDate;
    });
  };
  if (to) {
    let toDate = new Date(to);
    log = log.filter(item => {
      let itemDate = new Date(item.date);
      return itemDate <= toDate;
    });
  };
  if (limit) {
    log = log.slice(0, limit);
  };
  res.json({ username: user.username, count: log.length, _id: id, log: log});
});


app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});