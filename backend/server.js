const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/appointments', require('./routes/appointments'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Listen for queue updates
  socket.on('queue-update', (data) => {
    io.emit('queue-updated', data);
  });

  // Listen for patient check-in
  socket.on('patient-checkin', (data) => {
    io.emit('patient-checked-in', data);
  });

  // Listen for status change
  socket.on('status-change', (data) => {
    io.emit('queue-status-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };
