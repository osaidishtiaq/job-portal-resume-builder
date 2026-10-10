const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/job_portal',
      {
        serverSelectionTimeoutMS: 3000 // Timeout after 3 seconds if MongoDB is offline
      }
    );
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    console.log('[MongoDB Tip] Make sure MongoDB is installed and running locally, or set a valid MONGO_URI in server/.env');
  }
};

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
