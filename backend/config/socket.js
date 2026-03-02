import jwt from 'jsonwebtoken';

export const initSocketIO = (io) => {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);
    
    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    
    // Handle location room joins
    socket.on('join:location', (locationId) => {
      socket.join(`location:${locationId}`);
      console.log(`User ${socket.userId} joined location:${locationId}`);
    });
    
    socket.on('leave:location', (locationId) => {
      socket.leave(`location:${locationId}`);
    });
    
    // Handle on-duty status
    socket.on('status:onduty', () => {
      socket.join('onDuty');
    });
    
    socket.on('status:offduty', () => {
      socket.leave('onDuty');
    });
    
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });
  
  return io;
};

// Helper functions to emit events
export const emitToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToLocation = (io, locationId, event, data) => {
  io.to(`location:${locationId}`).emit(event, data);
};

export const emitToOnDuty = (io, event, data) => {
  io.to('onDuty').emit(event, data);
};
