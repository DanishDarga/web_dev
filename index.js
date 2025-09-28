// =================================================================
//                         IMPORTS & SETUP
// =================================================================
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const path = require("path");
const crypto = require("crypto");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user");
const ejsMate = require("ejs-mate");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");

require("dotenv").config();

const app = express();

// =================================================================
//                         DATABASE CONNECTION
// =================================================================
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// =================================================================
//                         MIDDLEWARE & APP CONFIG
// =================================================================
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(session(sessionConfig));
app.use(flash());

// =================================================================
//                         PASSPORT CONFIGURATION
// =================================================================
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration with passport-local-mongoose
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be signed in first!");
  res.redirect("/login");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
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
          user = new User(newUserInfo);
          // Register the new user with a random password to satisfy passport-local-mongoose
          const registeredUser = await User.register(
            user,
            crypto.randomBytes(16).toString("hex")
          );
          return done(null, registeredUser);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// =================================================================
//                         GLOBAL MIDDLEWARE
// =================================================================
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.path = req.path;
  next();
});

// =================================================================
//                              ROUTES
// =================================================================

// start Google authentication
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// callback route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful login
    res.redirect("/home");
  }
);

app.get("/home", (req, res) => {
  res.render("home.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/dashboard", ensureAuth, async (req, res) => {
  try {
    const allTransactions = await Transaction.find({ user: req.user._id });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalBalance = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    allTransactions.forEach((transaction) => {
      const isCurrentMonth =
        transaction.date && new Date(transaction.date) >= startOfMonth;

      if (transaction.type && transaction.type.toLowerCase() === "income") {
        totalBalance += transaction.amount;
        if (isCurrentMonth) monthlyIncome += transaction.amount;
      } else {
        totalBalance -= transaction.amount;
        if (isCurrentMonth) monthlyExpenses += transaction.amount;
      }
    });

    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    // Data for Pie Chart (Expense Categories)
    const expenseByCategory = {};
    allTransactions.forEach((transaction) => {
      if (transaction.type === "expense") {
        expenseByCategory[transaction.category] =
          (expenseByCategory[transaction.category] || 0) + transaction.amount;
      }
    });
    const pieChartLabels = Object.keys(expenseByCategory);
    const pieChartData = Object.values(expenseByCategory);

    // Data for Line Chart (Income vs Expense over last 6 months)
    const monthlyTrend = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
      const date = new Date(
        sixMonthsAgo.getFullYear(),
        sixMonthsAgo.getMonth() + i,
        1
      );
      const monthKey = date.toLocaleString("en-US", { month: "short" }); // e.g., "Sep"
      monthlyTrend[monthKey] = { income: 0, expenses: 0 };
    }

    allTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.date);
      if (transactionDate >= sixMonthsAgo) {
        const monthKey = transactionDate.toLocaleString("en-US", {
          month: "short",
        });
        if (monthlyTrend.hasOwnProperty(monthKey)) {
          if (transaction.type === "income") {
            monthlyTrend[monthKey].income += transaction.amount;
          } else {
            monthlyTrend[monthKey].expenses += transaction.amount;
          }
        }
      }
    });

    const lineChartLabels = Object.keys(monthlyTrend);
    const lineChartIncomeData = lineChartLabels.map(
      (month) => monthlyTrend[month].income
    );
    const lineChartExpenseData = lineChartLabels.map(
      (month) => monthlyTrend[month].expenses
    );

    const savingsGoal = req.user.savingsGoal || 0;
    let savingsPercentage = 0;
    if (savingsGoal > 0) {
      // Calculate percentage based on total balance, but don't let it go below 0 or above 100.
      savingsPercentage = Math.min(
        100,
        Math.max(0, (totalBalance / savingsGoal) * 100)
      );
    }

    res.render("dashboard.ejs", {
      username: req.user.displayName || req.user.username,
      transactions: recentTransactions,
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      pieChartLabels,
      pieChartData,
      lineChartLabels,
      lineChartIncomeData,
      lineChartExpenseData,
      savingsGoal,
      savingsPercentage,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    req.flash("error", "Could not load dashboard data.");
    res.redirect("/home");
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to FinanceFlow!");
      res.redirect("/home");
    });
  } catch (error) {
    req.flash("error", error.message);
    res.redirect("/signup");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/home");
  });
});

app.get("/managefinance", ensureAuth, async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id }).sort({
    date: -1,
  });
  res.render("managefinance.ejs", { transactions });
});

app.post("/transactions", ensureAuth, async (req, res) => {
  try {
    const { type, amount, category, item } = req.body;
    const newTransaction = new Transaction({
      type,
      amount,
      category,
      item,
      user: req.user._id,
    });
    await newTransaction.save();
    req.flash("success", "Transaction added successfully!");
    res.redirect("/managefinance");
  } catch (error) {
    console.error("Error adding transaction:", error);
    req.flash("error", "Could not add transaction. Please check all fields.");
    res.redirect("/managefinance");
  }
});

app.get("/transactions/new", ensureAuth, (req, res) => {
  res.render("new_transaction");
});

app.get("/transactions/:id/edit", ensureAuth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!transaction) {
      req.flash(
        "error",
        "Transaction not found or you do not have permission to edit it."
      );
      return res.redirect("/managefinance");
    }
    res.render("edit_transaction", { transaction });
  } catch (error) {
    console.error("Error fetching transaction for edit:", error);
    req.flash("error", "Could not load the edit page.");
    res.redirect("/managefinance");
  }
});

app.post("/transactions/:id/update", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTransaction) {
      req.flash(
        "error",
        "Transaction not found or you do not have permission to update it."
      );
      return res.redirect("/managefinance");
    }
    req.flash("success", "Transaction updated successfully!");
    res.redirect("/managefinance");
  } catch (error) {
    console.error("Error updating transaction:", error);
    req.flash(
      "error",
      "Could not update transaction. Please check all fields."
    );
    res.redirect(`/transactions/${req.params.id}/edit`);
  }
});

app.post("/transactions/:id/delete", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });
    if (!deletedTransaction) {
      req.flash(
        "error",
        "Transaction not found or you do not have permission to delete it."
      );
      return res.redirect("/managefinance");
    }
    req.flash("success", "Transaction deleted successfully!");
    res.redirect("/managefinance");
  } catch (error) {
    console.error("Error deleting transaction:", error);
    req.flash("error", "Could not delete transaction.");
    res.redirect("/managefinance");
  }
});

app.post("/savings-goal", ensureAuth, async (req, res) => {
  try {
    const { goalAmount } = req.body;
    const userId = req.user._id;

    const amount = Number(goalAmount);
    if (isNaN(amount) || amount < 0) {
      req.flash(
        "error",
        "Please enter a valid, non-negative number for your goal."
      );
      return res.redirect("/dashboard");
    }

    await User.findByIdAndUpdate(userId, { savingsGoal: amount });
    req.flash("success", "Savings goal updated successfully!");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error updating savings goal:", error);
    req.flash("error", "Could not update your savings goal. Please try again.");
    res.redirect("/dashboard");
  }
});

app.post("/reset-data", ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    // Delete all transactions associated with the user
    await Transaction.deleteMany({ user: userId });
    req.flash("success", "All transaction data has been successfully reset.");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error resetting user data:", error);
    req.flash("error", "Could not reset your data. Please try again.");
    res.redirect("/dashboard");
  }
});

// =================================================================
//                            SERVER START
// =================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
