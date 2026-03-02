import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database.js';
import { initSocketIO } from './config/socket.js';
import { startCronJobs } from './utils/cronJobs.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import locationRoutes from './routes/locations.js';
import shiftRoutes from './routes/shifts.js';
import swapRoutes from './routes/swaps.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection check middleware (skip for health endpoint)
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database connection not ready',
      message: 'The server is starting up. Please try again in a moment.'
    });
  }
  
  next();
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    port: PORT
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    correlationId: req.id || Date.now().toString()
  });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

// Connect to database first, but don't exit on failure
connectDB().then((conn) => {
  if (conn) {
    initSocketIO(io);
    startCronJobs();
    console.log('✅ All services initialized');
  } else {
    console.warn('⚠️  MongoDB connection failed - API will not work');
    console.warn('⚠️  Check MONGO_URI environment variable');
  }
}).catch(err => {
  console.error('Failed to initialize services:', err);
});

// Start server (bind to port for Render health checks)
// Server starts regardless of DB connection status
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Binding to 0.0.0.0:${PORT}`);
});

export { io };
