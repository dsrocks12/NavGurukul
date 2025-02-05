// controllers/authController.js
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const bcrypt = require('bcrypt');

exports.getLogin = (req, res) => {
  res.render('login', { request: req });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.fields;
  const db = req.app.get('database');
  const user = await db.collection('users').findOne({ email: email });
  if (!user) {
    req.status = "error";
    req.message = "Email does not exist.";
    return res.render('login', { request: req });
  }
  bcrypt.compare(password, user.password, function(err, isMatch) {
    if (isMatch) {
      req.session.user = user;
      return res.redirect('/');
    } else {
      req.status = "error";
      req.message = "Password is not correct.";
      return res.render('login', { request: req });
    }
  });
};

exports.getRegister = (req, res) => {
  res.render('register', { request: req });
};

exports.postRegister = async (req, res) => {
  const { name, email, password } = req.fields;
  const db = req.app.get('database');
  const user = await db.collection('users').findOne({ email: email });
  if (user) {
    req.status = "error";
    req.message = "Email already exists.";
    return res.render('register', { request: req });
  }
  bcrypt.hash(password, 10, async (err, hash) => {
    if (err) {
      req.status = "error";
      req.message = "Error registering user.";
      return res.render('register', { request: req });
    }
    await db.collection('users').insertOne({
      name,
      email,
      password: hash,
      reset_token: "",
      uploaded: [],
      sharedWithMe: [],
      isVerified: true,
      verification_token: new Date().getTime()
    });
    req.status = "success";
    req.message = "Signed up successfully. You can login now.";
    return res.render('register', { request: req });
  });
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};
