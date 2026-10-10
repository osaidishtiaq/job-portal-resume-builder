const { getDBStatus } = require('../config/db');

const getHealthStatus = (req, res) => {
  const dbStatus = getDBStatus();
  
  res.status(200).json({
    status: 'OK',
    message: 'Job Portal API is operational',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStatus,
    },
    environment: process.env.NODE_ENV || 'development'
  });
};

module.exports = { getHealthStatus };
