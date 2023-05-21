require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
  googleId: String,
  username: String,
  secret: String,
});
Schema.plugin(passportLocalMongoose); //plugin added to schema
Schema.plugin(findOrCreate);
const User = new mongoose.model("users", Schema);

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      User.findOrCreate(
        { googleId: profile.id, username: profile.emails[0].value },
        function (err, user) {
          done(err, user);
        }
      );
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);
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
app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } })
    .then((data) => {
      res.render("secrets", { userWithSecrets: data });
    })
    .catch((err) => {
      if (err) {
        console.log(err);
      }
    });
});
app
  .route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post((req, res) => {
    const secret = req.body.secret;
    User.findById(req.user.id).then((data) => {
      data.secret = secret;
      data
        .save()
        .then(() => {
          res.redirect("/secrets");
        })
        .catch((err) => {
          if (err) {
            console.log(err);
          }
        });
    });
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

app.listen(3000, () => {
  console.log("listening to —3000");
});
