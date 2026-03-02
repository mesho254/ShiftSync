import Notification from '../models/Notification.js';

export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    let query = {};
    
    // Admins can see all notifications, others only see their own
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    
    // Unread count based on user role
    let unreadQuery = { read: false };
    if (req.user.role !== 'admin') {
      unreadQuery.userId = req.user._id;
    }
    const unreadCount = await Notification.countDocuments(unreadQuery);
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    const query = { _id: { $in: notificationIds } };
    
    // Non-admins can only mark their own notifications as read
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }
    
    await Notification.updateMany(query, { read: true });
    
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const query = { read: false };
    
    // Non-admins can only mark their own notifications as read
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }
    
    await Notification.updateMany(query, { read: true });
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Non-admins can only mark their own notifications as read
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }
    
    const notification = await Notification.findOneAndUpdate(
      query,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
