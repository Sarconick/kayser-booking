// server.js — Node.js backend for Kayser booking form
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
}

function loadBookings() {
  return JSON.parse(fs.readFileSync(BOOKINGS_FILE));
}
function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// Submit booking
app.post('/booking', (req, res) => {
  const { contactName, contactEmail, company, vat, truckPlate,
          reloadCity, newTruckNumber, date, timeslot } = req.body;

  if (!contactName || !contactEmail || !company || !vat || !truckPlate || !date || !timeslot) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const bookings = loadBookings();
  const alreadyReserved = bookings.find(b => b.date === date && b.timeslot === timeslot);
  if (alreadyReserved) {
    return res.status(409).json({ error: 'Timeslot already reserved' });
  }

  const newBooking = {
    timestamp: new Date().toISOString(),
    contactName, contactEmail, company, vat, truckPlate,
    reloadCity, newTruckNumber, date, timeslot
  };

  bookings.push(newBooking);
  saveBookings(bookings);

  res.json({ message: 'Booking successful', booking: newBooking });
});

// Get reserved slots
app.get('/reserved', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const bookings = loadBookings();
  const reservedSlots = bookings.filter(b => b.date === date).map(b => b.timeslot);
  res.json({ reservedSlots });
});

app.listen(PORT, () => {
  console.log(`Booking backend running at http://localhost:${PORT}`);
});
