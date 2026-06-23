

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;   // ← This line is important

const DATA_FILE = path.join(__dirname, 'data.json');

const ADMIN_PASSWORD = "sirius2026"; // Change this later!

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('public'));

// Initialize data
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

app.post('/submit-request', (req, res) => {
  const { name, phone, type, message } = req.body;
  const data = loadData();
  
  data.requests.push({
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    name,
    phone,
    type,
    message,
    status: "New"
  });
  
  saveData(data);
  res.send(`<h2 style="text-align:center;padding:60px;font-family:sans-serif;color:green;">
    ✅ Request Received!<br><br>
    We will contact you soon via WhatsApp.<br>
    <a href="/" style="color:#eab308">← Back to Home</a>
  </h2>`);
});

// ===================== ADMIN =====================
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

// Add New Property
app.post('/add-property', (req, res) => {
  const { title, price, type, location, description, image } = req.body;
  const data = loadData();
  
  data.properties.push({
    id: Date.now(),
    title,
    price,
    type,
    location,
    description,
    image: image || "https://picsum.photos/id/1015/600/400",
    date: new Date().toISOString().split('T')[0]
  });
  
  saveData(data);
  res.redirect('/dashboard');
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
  console.log(`Server running on port ${PORT}`);
});