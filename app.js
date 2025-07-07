const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const User = require('./models/User');
const Item = require('./models/Item');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET || 'myRiceMillSecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));

// Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Routes

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Register
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if(!username || !password) {
      return res.send('Please provide username and password');
    }

    const existingUser = await User.findOne({ username });
    if(existingUser) {
      return res.send('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send('Error registering user');
  }
});

// Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if(user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      return res.redirect('/dashboard');
    } else {
      return res.send('Invalid username or password');
    }
  } catch (err) {
    console.error(err);
    res.send('Error during login');
  }
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('dashboard', { user });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if(err) {
      console.error(err);
    }
    res.redirect('/login');
  });
});

// Item Management Routes

// List items
app.get('/items', isAuthenticated, async (req, res) => {
  try {
    const items = await Item.find({ addedBy: req.session.userId }).sort({ dateAdded: -1 });
    res.render('items', { items });
  } catch (err) {
    console.error(err);
    res.send('Error loading items');
  }
});

// Show new item form
app.get('/items/new', isAuthenticated, (req, res) => {
  res.render('new-item');
});

// Handle new item submission
app.post('/items/new', isAuthenticated, async (req, res) => {
  try {
    const { itemName, quantity, pricePerUnit } = req.body;
    if(!itemName || !quantity || !pricePerUnit) {
      return res.send('All fields are required');
    }
    await Item.create({
      itemName,
      quantity,
      pricePerUnit,
      addedBy: req.session.userId,
      dateAdded: new Date()
    });
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.send('Error adding item');
  }
});

// Show edit form
app.get('/items/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, addedBy: req.session.userId });
    if(!item) return res.redirect('/items');
    res.render('edit-item', { item });
  } catch (err) {
    console.error(err);
    res.redirect('/items');
  }
});

// Handle edit submission
app.post('/items/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { itemName, quantity, pricePerUnit } = req.body;
    if(!itemName || !quantity || !pricePerUnit) {
      return res.send('All fields are required');
    }
    await Item.updateOne(
      { _id: req.params.id, addedBy: req.session.userId },
      { itemName, quantity, pricePerUnit }
    );
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.send('Error updating item');
  }
});

// Delete item
app.post('/items/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Item.deleteOne({ _id: req.params.id, addedBy: req.session.userId });
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.send('Error deleting item');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
