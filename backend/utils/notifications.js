import Notification from '../models/Notification.js';

export const createNotification = async (data, session = null, io = null) => {
  try {
    const notification = new Notification({
      userId: data.userId,
      category: data.category,
      title: data.title,
      body: data.body,
      payload: data.payload
    });
    
    if (session) {
      await notification.save({ session });
    } else {
      await notification.save();
    }
    
    // Emit socket event if io instance is provided
    if (io) {
      const { emitToUser } = await import('../config/socket.js');
      emitToUser(io, data.userId.toString(), 'notifications:new', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

