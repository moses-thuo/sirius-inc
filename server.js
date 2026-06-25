const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== MONGOOSE CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Error:', err));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Multer Setup
const upload = multer({ 
  dest: 'public/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

// ===================== SCHEMAS =====================
const PropertySchema = new mongoose.Schema({
  title: String,
  price: Number,
  type: String,
  location: String,
  description: String,
  media: String,
  isVideo: Boolean,
  date: String
});

const RequestSchema = new mongoose.Schema({
  name: String,
  phone: String,
  type: String,
  message: String,
  date: String,
  status: String
});

const VisitorSchema = new mongoose.Schema({
  date: String,
  count: { type: Number, default: 1 }
});

const Property = mongoose.model('Property', PropertySchema);
const Request = mongoose.model('Request', RequestSchema);
const Visitor = mongoose.model('Visitor', VisitorSchema);

// ===================== VISITOR COUNTER (Fixed) =====================
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/dashboard') {
    const today = new Date().toISOString().split('T')[0];
    await Visitor.findOneAndUpdate(
      { date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true }   // This line was causing warning
    ).catch(err => console.error("Visitor error:", err));
  }
  next();
});

// ===================== ROUTES =====================
app.get('/', async (req, res) => {
  const properties = await Property.find().sort({ date: -1 });
  res.render('index', { properties });
});

app.post('/submit-request', async (req, res) => {
  const { name, phone, type, message } = req.body;
  await Request.create({
    name, phone, type, message,
    date: new Date().toISOString().split('T')[0],
    status: "New"
  });
  console.log(`🔔 NEW REQUEST: ${name} - ${phone}`);
  res.send(`<h2 style="text-align:center;padding:60px;color:green;">✅ Request Received!</h2>`);
});

// Admin Routes
const ADMIN_PASSWORD = "sirius2026";

app.get('/admin-login', (req, res) => res.render('admin-login'));

app.post('/admin-login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.redirect('/dashboard');
  } else {
    res.send('<h3 style="color:red;text-align:center;margin-top:100px">Wrong Password. <a href="/admin-login">Try Again</a></h3>');
  }
});

app.get('/dashboard', async (req, res) => {
  try {
    const properties = await Property.find().sort({ date: -1 });
    const requests = await Request.find().sort({ date: -1 });
    const visitors = await Visitor.find().sort({ date: -1 }).limit(7);
    
    res.render('dashboard', { properties, requests, visitors });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send("Server Error - Check Logs");
  }
});

// Add Property
app.post('/add-property', upload.single('media'), async (req, res) => {
  try {
    const { title, price, type, location, description } = req.body;
    
    let mediaUrl = "https://picsum.photos/id/1015/600/400";
    if (req.file) mediaUrl = `/uploads/${req.file.filename}`;
    else if (req.body.image) mediaUrl = req.body.image;

    await Property.create({
      title: title || "Untitled Property",
      price: parseFloat(price) || 0,
      type: type || "",
      location: location || "",
      description: description || "",
      media: mediaUrl,
      isVideo: req.file ? req.file.mimetype.startsWith('video') : false,
      date: new Date().toISOString().split('T')[0]
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error("Add Property Error:", error);
    res.status(500).send("Error adding property");
  }
});

// Delete Property
app.post('/delete-property', async (req, res) => {
  await Property.findByIdAndDelete(req.body.id);
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`🚀 SIRIUS INC Server running on port ${PORT}`);
});