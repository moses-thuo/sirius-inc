const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== MONGO CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err.message));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Multer
const upload = multer({ dest: 'public/uploads/' });
if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

// ===================== SCHEMAS (Defined Once) =====================
const Property = mongoose.model('Property', new mongoose.Schema({
  title: String,
  price: Number,
  type: String,
  location: String,
  description: String,
  media: String,
  isVideo: Boolean,
  date: String
}));

const Request = mongoose.model('Request', new mongoose.Schema({
  name: String,
  phone: String,
  type: String,
  message: String,
  date: String,
  status: String
}));

// Define Visitor model only once
const Visitor = mongoose.models.Visitor || mongoose.model('Visitor', new mongoose.Schema({
  date: String,
  count: { type: Number, default: 1 }
}));

// ===================== VISITOR COUNTER =====================
app.use(async (req, res, next) => {
  if (req.path === '/') {
    try {
      const today = new Date().toISOString().split('T')[0];
      await Visitor.findOneAndUpdate(
        { date: today },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    } catch (e) {
      // Silent fail - don't break the site
      console.error("Visitor counter error:", e.message);
    }
  }
  next();
});

// ===================== ROUTES =====================
app.get('/', async (req, res) => {
  try {
    const properties = await Property.find().sort({ date: -1 });
    res.render('index', { properties });
  } catch (error) {
    console.error("Homepage Error:", error);
    res.render('index', { properties: [] });
  }
});

app.post('/submit-request', async (req, res) => {
  try {
    await Request.create({
      ...req.body,
      date: new Date().toISOString().split('T')[0],
      status: "New"
    });
    console.log(`🔔 NEW REQUEST: ${req.body.name}`);
    res.send(`<h2 style="text-align:center;padding:60px;color:green;">✅ Request Received!</h2>`);
  } catch (e) {
    res.send(`<h2 style="text-align:center;padding:60px;color:red;">Error. Please try again.</h2>`);
  }
});

const ADMIN_PASSWORD = "sirius2026";

app.get('/admin-login', (req, res) => res.render('admin-login'));

app.post('/admin-login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) res.redirect('/dashboard');
  else res.send('<h3 style="color:red;text-align:center;margin-top:100px">Wrong Password. <a href="/admin-login">Try Again</a></h3>');
});

app.get('/dashboard', async (req, res) => {
  try {
    const properties = await Property.find().sort({ date: -1 });
    const requests = await Request.find().sort({ date: -1 });
    res.render('dashboard', { properties, requests });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.render('dashboard', { properties: [], requests: [] });
  }
});

app.post('/add-property', upload.single('media'), async (req, res) => {
  try {
    let mediaUrl = req.body.image || "https://picsum.photos/id/1015/600/400";
    if (req.file) mediaUrl = `/uploads/${req.file.filename}`;

    await Property.create({
      title: req.body.title || "Untitled Property",
      price: parseFloat(req.body.price) || 0,
      type: req.body.type || "",
      location: req.body.location || "",
      description: req.body.description || "",
      media: mediaUrl,
      isVideo: req.file ? req.file.mimetype.startsWith('video') : false,
      date: new Date().toISOString().split('T')[0]
    });
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.status(500).send("Error adding property");
  }
});

app.post('/delete-property', async (req, res) => {
  await Property.findByIdAndDelete(req.body.id);
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`🚀 SIRIUS INC running on port ${PORT}`);
});