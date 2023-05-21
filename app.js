require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(
  session({
    secret: process.env.SECRET, // any long string
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize()); // initialize passport
app.use(passport.session()); // use passport to manage session

mongoose.connect("mongodb://127.0.0.1:27017/secrets");
const Schema = new mongoose.Schema({
  email: String,
  password: String,
});
Schema.plugin(passportLocalMongoose); //plugin added to schema
const User = new mongoose.model("users", Schema);

passport.use(User.createStrategy()); // local login staratigies
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});
app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
          console.log(`logged in as —${req.body.username}`);
        });
      }
    });
  });
app.route("/secrets").get((req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});
app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
            console.log(`${req.body.username} —registered`);
          });
        }
      }
    );
  });

app.route("/logout").get((req, res) => {
  req.logOut((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.listen(5000, () => {
  console.log("listening to —5000");
});
