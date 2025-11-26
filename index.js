const express = require("express");
require('dotenv').config();
const morgan = require("morgan");
const nocache = require("nocache");
const mongoose = require("mongoose");
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const uri = process.env.MONGODB_URI;
 

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const app = express();

 

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(nocache());
 
app.use(express.static('public'))

 
 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public/homeAssets')));
app.use(express.static(path.join(__dirname, 'public/adminHomeAssets')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  
}));

require('./passport')

app.use(passport.initialize());
app.use(passport.session());


const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');

const config = require('./config/config');

app.use('/',userRoute);
app.use('/admin',adminRoute)

app.all('*', (req, res) => {
  res.status(404).render('users/error', { status: 404, error: '' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT,() => {
    console.log(`Server running on port ${PORT}`);
})