// ESTA ES LA VERSION QUE PASA TODOS LOS TESTS DE FCC

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

let port = process.env.PORT || 3000; //saca el numero de puerto del archivo sample.env

app.use(express.static('public')); //levanta el css de la carpeta public

app.get('/', (req, res) => { //levanta el html de la carpeta views
  res.sendFile(__dirname + '/views/index.html')
});

const Schema = mongoose.Schema; //crea el schema en Mongodb

const exerciseSchema = new Schema({ //crea el schema o estructura de tabla exercisesSchema
  description: {type: String, required: true}, 
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now}
  });

const userSchema = new Schema({ //crea el schema o estructura de tabla userSchema
  username: {type: String, required: true},
  log: [exerciseSchema]
});

//crea los modelos de los 2 schemas
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

//endpoint para crear el usuario y para obtenerlo
app.post('/api/users', async (req, res, next) => {
  try {
    const { username } = req.body;
    if (username) {
      const newUser = new User({username: username});
      res.json({username: newUser.username, _id: newUser._id});
      await newUser.save();
    } else {res.send('Enter a username')};
  } catch (error) {
      return next(error);
    };
}).get('/api/users', async (req, res, next) => {
  try {
    let user = await User.find();
    user? res.json(user) : res.send('No users registered in db');
  } catch (error) {
      return next(error);
    }
});

//endpoint para crear el log de ejercicios y anexarlo al array log del usuario
app.post('/api/users/:_id/exercises', async (req, res, next) => {
  try {
    let { description, duration, date } = req.body;
    const { _id } = req.params;
    date = date? new Date(date.replaceAll('-', ',')) : new Date();
    const users = await User.findById(_id);
    if (users != null) {
      const newExercise = new Exercise({description, duration, date});
      await newExercise.save();
      const newUser = await User.findByIdAndUpdate(_id, {$push: {log: newExercise}});
      res.json({
        username: users.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date.toDateString(),
        _id: users.id
      });
      await newUser.save();
    } else {res.send('No username found in Users database')};
  } catch (error) {
      return next(error);
    };
});

//endpoint para filtrar por fechas y por cantidad de registros
app.get('/api/users/:_id/logs?', async (req, res, next) => {
  try {
    let { _id } = req.params;
    let { from, to, limit } = req.query;
    let user = await User.findById(_id);
    if (user) {
      if (from) {
        let fromDate = new Date(from.replaceAll('-', ','));
        user.log = user.log.filter(item => {
          let itemDate = new Date(item.date);
          return itemDate >= fromDate;
        });
      };
      if (to) {
        let toDate = new Date(to.replaceAll('-', ','));
        user.log = user.log.filter(item => {
          let itemDate = new Date(item.date);
          return itemDate <= toDate;
        });
      };
      if (limit <= user.log.length) {
        user.log = user.log.slice(0, limit);
      };
      let arr = user.log.map(items => {
        let formattedDate = new Date(items.date).toDateString();
        return {  description: items.description, duration: items.duration, date: formattedDate }
      })
      res.json({ username: user.username, count: user.log.length, _id: _id, log: arr});
    } else {res.send('No user found in Users database')};
  } catch (error) {
      return next(error);
  }
});

//para que el puerto este listo escuchando cambios
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});