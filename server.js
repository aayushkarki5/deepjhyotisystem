// ===== server.js =====
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Full details:');
  console.log('Error name:', err.name);
  console.log('Error message:', err.message);
  console.log('Stack trace:', err.stack);
  process.exit(1);
});
require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (create tables if they don't exist)
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      console.log('📊 Database synced successfully.');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Deepjhyoti Forest Management Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();