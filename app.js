require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const md5 = require("md5");
const ejs = require("ejs");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

mongoose.connect("mongodb://127.0.0.1:27017/secrets");
const Schema = mongoose.Schema({
  email: String,
  password: String,
});
const User = mongoose.model("users", Schema);

app.get("/", (req, res) => {
  res.render("home");
});
app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({ email: username })
      .then((data) => {
        if (data.password == md5(password)) {
          console.log(`logged in as —${username}`);
          res.render("secrets");
        }
      })
      .catch((err) => {
        if (err) {
          console.log(err);
        }
      });
  });
app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = md5(req.body.password);
    const newUser = new User({
      email: username,
      password: password,
    });
    newUser
      .save()
      .then(() => {
        console.log(`${username} —registered`);
        res.render("secrets");
      })
      .catch((err) => {
        if (err) {
          console.log(err);
        }
      });
  });

app.listen(5000, () => {
  console.log("listening to —5000");
});
