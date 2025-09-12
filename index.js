const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Transaction = require('./models/Transaction');

mongoose.connect('mongodb://127.0.0.1:27017/finance-tracker-app')
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

app.set('view engine', 'ejs');

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'SECRET123',
    resave: false,
    saveUninitialized: false
}));
// flash middleware
app.use(flash());
// initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// serialize / deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: "81686256472-dm31lekf7cagreel3fo0g84274gnvnen.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        const newUserInfo = {
            googleId: profile.id,
            displayName: profile.displayName,
            username: profile.emails[0].value, // Use email as the username
        };

        try {
            // Find a user based on Google ID
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // User already exists, ensure their displayName is up-to-date
                user.displayName = newUserInfo.displayName;
                await user.save();
                return done(null, user);
            } else {
                // If not, find a user based on email (username) to link accounts
                user = await User.findOne({ username: newUserInfo.username });
                if (user) {
                    // User signed up with email/pass. Link their Google account.
                    user.googleId = newUserInfo.googleId;
                    user.displayName = newUserInfo.displayName;
                    await user.save();
                    return done(null, user);
                }
                // If no user is found by googleId or email, create a new one
                const newUser = await User.create(newUserInfo);
                return done(null, newUser);
            }
        } catch (err) {
            return done(err, null);
        }
    }
));

// start Google authentication
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// callback route
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful login
        res.redirect('/home');
    }
);

// dashboard route (protected)
app.get("/home", (req, res) => {
    res.render("home.ejs", { user: req.user });
})
app.get("/signup", (req, res) => {
    res.render("signup.ejs", { messages: req.flash('error') });
})

app.post("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        // It's crucial to hash passwords before storing them.
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword
        });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        // This will catch errors, including the one for a duplicate username
        if (error.code === 11000) { // MongoDB duplicate key error
            req.flash('error', 'Username already exists. Please choose another one.');
        } else {
            console.log(error);
            req.flash('error', 'An error occurred during signup. Please try again.');
        }
        res.redirect('/signup');
    }
});


app.get("/login", (req, res) => {
    res.render("login.ejs", { messages: req.flash('error') });
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/home',
        failureRedirect: '/login',
        failureFlash: true
    })
);

app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/home');
    });
});
app.get("/managefinance", ensureAuth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ date: -1 });

        const expenditureByCategory = await Transaction.aggregate([
            {
                $match: {
                    user: req.user._id,
                    type: 'Expense'
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.render("managefinance.ejs", { user: req.user, transactions: transactions, expenditureByCategory });
    } catch (error) {
        console.log(error);
        req.flash('error', 'Could not fetch transactions.');
        res.redirect('/home');
    }
});

app.post('/transactions', ensureAuth, async (req, res) => {
    try {
        const { type, amount, category, description } = req.body;
        const newTransaction = new Transaction({
            type, category, amount, description,
            user: req.user.id,
            date: new Date()
        });
        await newTransaction.save();
        res.redirect('/managefinance');
    } catch (error) {
        console.log(error);
        req.flash('error', 'There was a problem adding the transaction.');
        res.redirect('/managefinance');
    }
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});