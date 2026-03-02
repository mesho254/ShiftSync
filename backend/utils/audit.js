import AuditLog from '../models/AuditLog.js';

export const createAuditLog = async (data, session = null) => {
  try {
    const log = new AuditLog({
      actorId: data.actorId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      before: data.before,
      after: data.after,
      metadata: data.metadata,
      timestamp: new Date()
    });
    
    if (session) {
      await log.save({ session });
    } else {
      await log.save();
    }
    
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
