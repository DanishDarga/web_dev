const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('passport');

app.use(session({
    secret: 'SECRET123',
    resave: false,
    saveUninitialized: false
}));
// initialize passport
app.use(passport.initialize());
app.use(passport.session());

// serialize / deserialize user
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

app.get("/home", (req, res) => {
    res.render("home.ejs");
})
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
})
app.get("/login", (req, res) => {
    res.render("login.ejs");
});
app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});