// app.js
const express = require('express');
const app = express();
const path = require('path');
const formidable = require('express-formidable');
const session = require('express-session');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

// Use formidable to parse form-data
app.use(formidable());

// Set up session middleware
app.use(session({
  secret: 'secret key',
  resave: false,
  saveUninitialized: false
}));

// Serve static files from the public folder
app.use('/public', express.static(path.join(__dirname, 'public')));

// Set EJS as templating engine
app.set('view engine', 'ejs');

// Set a main URL for easy reference
const mainURL = 'http://localhost:3000';
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/file_transfer', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Mongoose connected to database"))
.catch(err => console.error("Mongoose connection error:", err));


// Global middleware to attach common data to every request
app.use((req, res, next) => {
  req.mainURL = mainURL;
  req.isLogin = (typeof req.session.user !== 'undefined');
  req.user = req.session.user;
  next();
});

// Connect to MongoDB and save the database instance in app locals
let database = null;
MongoClient.connect("mongodb://localhost:27017", { useUnifiedTopology: true }, (err, client) => {
  if (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
  database = client.db("file_transfer");
  app.set('database', database);
  console.log("Database connected.");

  // Start the server only after the DB connection is made.
  app.listen(3000, () => console.log(`Server started at ${mainURL}`));
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const homeRoutes = require('./routes/homeRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Use the routes
app.use('/', homeRoutes);
app.use('/', authRoutes);
app.use('/', fileRoutes);
app.use('/', adminRoutes);
