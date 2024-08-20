const express = require("express");
const morgan = require("morgan");
const nocache = require("nocache");
const mongoose = require("mongoose");
const path = require('path');
const session = require('express-session');
const passport = require('passport');
mongoose.connect("mongodb://127.0.0.1:27017/luxewatches").then(() => console.log('mongodb connected'));

const app = express();

//app.use(express.static('public'))

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(nocache());
// app.use(morgan("dev"))
app.use(express.static('public'))

require('dotenv').config();
 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public/homeAssets')));
app.use(express.static(path.join(__dirname, 'public/adminHomeAssets')));
app.use(express.static(path.join(__dirname, 'public')));


const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');

const config = require('./config/config');

app.use('/',userRoute);
app.use('/admin',adminRoute)

app.listen(5000,() => {
    console.log('http://localhost:5000');
})