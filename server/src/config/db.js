require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    const error = new Error('MONGO_URI is not defined in environment variables.');
    console.error(`[MongoDB Configuration Error] ${error.message}`);
    throw error;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // Log the error message cleanly without printing credentials or the full URI
    console.error(`[MongoDB Connection Error] Failed to connect: ${error.message}`);
    throw error;
  }
};

// Connection event listeners for runtime monitoring
mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB Runtime Error] ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Event] Connection disconnected.');
});

const getDBStatus = () => {
  // readyState values: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return stateMap[mongoose.connection.readyState] || 'unknown';
};

module.exports = { connectDB, getDBStatus };
