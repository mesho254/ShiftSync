import { DateTime } from 'luxon';
import Shift from '../models/Shift.js';

export const getOvertimeAnalytics = async (req, res) => {
  try {
    const { locationId, weekStart } = req.query;
    
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    
    const shifts = await Shift.find({
      locationId,
      startUtc: { $gte: start, $lt: end },
      published: true
    }).populate('assigned', 'name');
    
    const staffHours = {};
    
    for (const shift of shifts) {
      const hours = DateTime.fromJSDate(shift.endUtc)
        .diff(DateTime.fromJSDate(shift.startUtc), 'hours').hours;
      
      for (const staff of shift.assigned) {
        if (!staffHours[staff._id]) {
          staffHours[staff._id] = {
            userId: staff._id,
            name: staff.name,
            hours: 0,
            overtimeHours: 0
          };
        }
        staffHours[staff._id].hours += hours;
      }
    }
    
    // Calculate overtime (>40 hours)
    Object.values(staffHours).forEach(staff => {
      if (staff.hours > 40) {
        staff.overtimeHours = staff.hours - 40;
      }
    });
    
    res.json({
      weekStart,
      locationId,
      staff: Object.values(staffHours).sort((a, b) => b.hours - a.hours)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFairnessAnalytics = async (req, res) => {
  try {
    const { start, end, locationId } = req.query;
    
    const shifts = await Shift.find({
      locationId,
      startUtc: { $gte: new Date(start), $lte: new Date(end) },
      published: true
    }).populate('assigned', 'name desiredHoursPerWeek');
    
    const staffStats = {};
    
    for (const shift of shifts) {
      const hours = DateTime.fromJSDate(shift.endUtc)
        .diff(DateTime.fromJSDate(shift.startUtc), 'hours').hours;
      
      const shiftStart = DateTime.fromJSDate(shift.startUtc);
      const isPremium = shiftStart.weekday >= 6 || shiftStart.hour >= 18;
      
      for (const staff of shift.assigned) {
        if (!staffStats[staff._id]) {
          staffStats[staff._id] = {
            userId: staff._id,
            name: staff.name,
            totalHours: 0,
            shiftCount: 0,
            desiredHours: staff.desiredHoursPerWeek || 0,
            premiumShifts: 0,
            premiumHours: 0
          };
        }
        
        staffStats[staff._id].totalHours += hours;
        staffStats[staff._id].shiftCount += 1;
        
        if (isPremium) {
          staffStats[staff._id].premiumShifts += 1;
          staffStats[staff._id].premiumHours += hours;
        }
      }
    }
    
    // Calculate fairness metrics
    const stats = Object.values(staffStats);
    const avgHours = stats.reduce((sum, s) => sum + s.totalHours, 0) / (stats.length || 1);
    const avgPremiumShifts = stats.reduce((sum, s) => sum + s.premiumShifts, 0) / (stats.length || 1);
    
    stats.forEach(staff => {
      staff.variance = Math.abs(staff.totalHours - avgHours);
      staff.premiumVariance = Math.abs(staff.premiumShifts - avgPremiumShifts);
      staff.desiredVsActual = staff.desiredHours ? 
        ((staff.totalHours / staff.desiredHours) * 100).toFixed(1) : null;
      
      // Determine if under/over scheduled
      if (staff.desiredHours > 0) {
        const weekCount = DateTime.fromISO(end).diff(DateTime.fromISO(start), 'weeks').weeks;
        const weeklyAverage = staff.totalHours / weekCount;
        
        if (weeklyAverage < staff.desiredHours * 0.8) {
          staff.schedulingStatus = 'under-scheduled';
        } else if (weeklyAverage > staff.desiredHours * 1.2) {
          staff.schedulingStatus = 'over-scheduled';
        } else {
          staff.schedulingStatus = 'balanced';
        }
      } else {
        staff.schedulingStatus = 'no-preference';
      }
    });
    
    res.json({
      period: { start, end },
      locationId,
      averageHours: avgHours.toFixed(1),
      averagePremiumShifts: avgPremiumShifts.toFixed(1),
      staff: stats.sort((a, b) => a.variance - b.variance)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOnDutyNow = async (req, res) => {
  try {
    const now = new Date();
    
    const shifts = await Shift.find({
      startUtc: { $lte: now },
      endUtc: { $gte: now },
      published: true
    })
      .populate('locationId', 'name')
      .populate('assigned', 'name email avatarUrl');
    
    const byLocation = {};
    
    for (const shift of shifts) {
      const locationId = shift.locationId._id.toString();
      
      if (!byLocation[locationId]) {
        byLocation[locationId] = {
          locationId,
          locationName: shift.locationId.name,
          shifts: [],
          staffCount: 0
        };
      }
      
      byLocation[locationId].shifts.push({
        shiftId: shift._id,
        startUtc: shift.startUtc,
        endUtc: shift.endUtc,
        requiredSkill: shift.requiredSkill,
        assigned: shift.assigned
      });
      
      byLocation[locationId].staffCount += shift.assigned.length;
    }
    
    res.json({
      timestamp: now,
      locations: Object.values(byLocation)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
