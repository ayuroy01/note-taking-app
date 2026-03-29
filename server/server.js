require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

// Import routes
const noteRoutes = require('./noteRoutes');

// To create express app
const app = express();

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Middleware for JSON request bodies with larger payload capability for Audio buffers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// To enable CORS
app.use(cors());

// API routes
app.use('/api/notes', noteRoutes);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});