import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { from, to, action, locationId, format } = req.query;
    const query = {};
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    
    if (action) query.action = action;
    
    let logs = await AuditLog.find(query)
      .populate('actorId', 'name email')
      .sort({ timestamp: -1 })
      .limit(1000);
    
    // Filter by location if specified (requires populating shift data)
    if (locationId) {
      const Shift = (await import('../models/Shift.js')).default;
      const shiftIds = await Shift.find({ locationId }).distinct('_id');
      logs = logs.filter(log => 
        log.targetType === 'Shift' && shiftIds.some(id => id.toString() === log.targetId.toString())
      );
    }
    
    if (format === 'csv') {
      const csv = convertToCSV(logs);
      res.header('Content-Type', 'text/csv');
      res.attachment('audit-log.csv');
      return res.send(csv);
    }
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getShiftHistory = async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    const logs = await AuditLog.find({
      targetType: 'Shift',
      targetId: shiftId
    })
      .populate('actorId', 'name email role')
      .sort({ timestamp: 1 });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function convertToCSV(logs) {
  const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target ID'];
  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.actorId?.name || 'System',
    log.action,
    log.targetType,
    log.targetId
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
