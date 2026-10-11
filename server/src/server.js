const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Allowed origins for CORS (supports localhost, 127.0.0.1, and .env CLIENT_URL)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any local origin in development
    if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Job Portal API',
    healthCheck: '/api/health',
    docs: 'Refer to README.md for endpoint instructions'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route not found: ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    // Ensure database connection is established before listening for requests
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=================================`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`=================================`);
    });
  } catch (error) {
    console.error(`[Server Startup Error] Could not start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
