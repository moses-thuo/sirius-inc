const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== CLOUDINARY CONFIG =====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

// Multer (temporary local storage)
const upload = multer({ dest: 'public/uploads/' });
if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

// ===================== SCHEMAS =====================
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

// ===================== VISITOR COUNTER =====================
app.use(async (req, res, next) => {
  if (req.path === '/') {
    try {
      const today = new Date().toISOString().split('T')[0];
      await mongoose.model('Visitor', new mongoose.Schema({ date: String, count: Number }))
        .findOneAndUpdate({ date: today }, { $inc: { count: 1 } }, { upsert: true });
    } catch (e) {
      console.error("Visitor error:", e.message);
    }
  }
  next();
});

// ===================== PUBLIC ROUTES =====================
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

// ===================== ADMIN ROUTES =====================
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

// Add Property with Cloudinary
app.post('/add-property', upload.single('media'), async (req, res) => {
  try {
    let mediaUrl = req.body.image || "https://picsum.photos/id/1015/600/400";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: req.file.mimetype.startsWith('video') ? 'video' : 'image'
      });
      mediaUrl = result.secure_url;
      fs.unlinkSync(req.file.path); // Delete local file
    }

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
  } catch (error) {
    console.error("Add Property Error:", error);
    res.status(500).send("Error uploading media");
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