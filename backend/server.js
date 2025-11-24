const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(bodyParser.json());

// GET reserved slots for a date
app.get('/reserved', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const result = await pool.query(
      'SELECT timeslot FROM bookings WHERE date = $1',
      [date]
    );
    const reservedSlots = result.rows.map(r => r.timeslot);
    res.json({ reservedSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST booking
app.post('/booking', async (req, res) => {
  const {
    contactName, contactEmail, company, vat,
    truckPlate, reloadCity, newTruckNumber,
    date, timeslot
  } = req.body;

  if (!date || !timeslot) {
    return res.status(400).json({ error: 'Date and timeslot are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO bookings
       (contact_name, contact_email, company, vat, truck_plate,
        reload_city, new_truck_number, date, timeslot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [contactName, contactEmail, company, vat, truckPlate,
       reloadCity, newTruckNumber, date, timeslot]
    );
    res.json({ message: 'Booking confirmed', id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: `Timeslot ${timeslot} is already booked.` });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// ✅ NEW: Get all bookings grouped by date
app.get('/bookings', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT date, timeslot, contact_name, company FROM bookings ORDER BY date, timeslot'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
