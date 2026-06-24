const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = "sirius2026"; // Change this later!

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Multer Setup - Supports both images and videos
const upload = multer({ 
  dest: 'public/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Create uploads folder
if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

// Initialize data file
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    properties: [],
    requests: [],
    logs: []
  }, null, 2));
}

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===================== PUBLIC ROUTES =====================
app.get('/', (req, res) => {
  const data = loadData();
  res.render('index', { properties: data.properties });
});

// Customer Request
app.post('/submit-request', (req, res) => {
  const { name, phone, type, message } = req.body;
  const data = loadData();

  const newRequest = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    name,
    phone,
    type,
    message,
    status: "New"
  };

  data.requests.push(newRequest);
  saveData(data);

  console.log("🔔 NEW CUSTOMER REQUEST");
  console.log(`Name: ${name} | Phone: ${phone}`);

  res.send(`
    <h2 style="text-align:center;padding:60px;font-family:sans-serif;color:green;">
      ✅ Request Received Successfully!<br><br>
      We will contact you soon via WhatsApp.<br><br>
      <a href="/" style="color:#eab308">← Back to Home</a>
    </h2>
  `);
});

// ===================== ADMIN ROUTES =====================
app.get('/admin-login', (req, res) => res.render('admin-login'));

app.post('/admin-login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.redirect('/dashboard');
  } else {
    res.send('<h3 style="color:red;text-align:center;margin-top:100px">Wrong Password. <a href="/admin-login">Try Again</a></h3>');
  }
});

app.get('/dashboard', (req, res) => {
  const data = loadData();
  res.render('dashboard', { data });
});

// FIXED: Add Property with Media Upload
app.post('/add-property', upload.single('media'), (req, res) => {
  try {
    const { title, price, type, location, description } = req.body;
    const data = loadData();

    let mediaUrl = "https://picsum.photos/id/1015/600/400";

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      mediaUrl = req.body.image;
    }

    data.properties.push({
      id: Date.now(),
      title: title || "Untitled Property",
      price: parseFloat(price) || 0,
      type: type || "",
      location: location || "",
      description: description || "",
      media: mediaUrl,
      isVideo: req.file ? req.file.mimetype.startsWith('video') : false,
      date: new Date().toISOString().split('T')[0]
    });

    saveData(data);
    res.redirect('/dashboard');
  } catch (error) {
    console.error("Add Property Error:", error);
    res.status(500).send("Error adding property. Please try again or check server logs.");
  }
});

// Delete Property
app.post('/delete-property', (req, res) => {
  const { id } = req.body;
  const data = loadData();
  data.properties = data.properties.filter(p => p.id != id);
  saveData(data);
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`🚀 SIRIUS INC Server running on port ${PORT}`);
});