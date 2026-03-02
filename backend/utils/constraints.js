import { DateTime } from 'luxon';
import Shift from '../models/Shift.js';
import User from '../models/User.js';
import Location from '../models/Location.js';

const MIN_REST_HOURS = 10;
const OVERTIME_WARNING_HOURS = 35;
const OVERTIME_HIGHLIGHT_HOURS = 40;
const MAX_DAILY_HOURS = 12;
const MAX_CONSECUTIVE_DAYS = 6;

export const checkConstraints = async (shiftId, userId, shift = null) => {
  const violations = [];
  
  if (!shift) {
    shift = await Shift.findById(shiftId).populate('locationId');
  }
  
  const user = await User.findById(userId).populate('certifiedLocations');
  
  if (!user) {
    violations.push({
      rule: 'user_not_found',
      msg: 'User not found'
    });
    return { valid: false, violations };
  }
  
  // Check certification
  const isCertified = user.certifiedLocations.some(
    loc => loc._id.toString() === shift.locationId._id.toString()
  );
  
  if (!isCertified) {
    violations.push({
      rule: 'not_certified',
      msg: `${user.name} is not certified for this location`
    });
  }
  
  // Check skill
  if (!user.skills.includes(shift.requiredSkill)) {
    violations.push({
      rule: 'missing_skill',
      msg: `${user.name} does not have the required skill: ${shift.requiredSkill}`
    });
  }
  
  // Check overlapping shifts
  const overlapping = await Shift.find({
    assigned: userId,
    _id: { $ne: shiftId },
    $or: [
      {
        startUtc: { $lt: shift.endUtc },
        endUtc: { $gt: shift.startUtc }
      }
    ]
  });
  
  if (overlapping.length > 0) {
    const overlap = overlapping[0];
    violations.push({
      rule: 'double_booked',
      msg: `${user.name} is already scheduled ${DateTime.fromJSDate(overlap.startUtc).toUTC().toISO()} - ${DateTime.fromJSDate(overlap.endUtc).toUTC().toISO()}`
    });
  }
  
  // Check minimum rest period
  const adjacentShifts = await Shift.find({
    assigned: userId,
    _id: { $ne: shiftId },
    $or: [
      { endUtc: { $lte: shift.startUtc, $gte: DateTime.fromJSDate(shift.startUtc).minus({ hours: MIN_REST_HOURS }).toJSDate() } },
      { startUtc: { $gte: shift.endUtc, $lte: DateTime.fromJSDate(shift.endUtc).plus({ hours: MIN_REST_HOURS }).toJSDate() } }
    ]
  });
  
  for (const adjacent of adjacentShifts) {
    const restHours = Math.abs(
      DateTime.fromJSDate(adjacent.endUtc).diff(DateTime.fromJSDate(shift.startUtc), 'hours').hours
    );
    
    if (restHours < MIN_REST_HOURS) {
      violations.push({
        rule: 'min_rest_period',
        msg: `Less than ${MIN_REST_HOURS} hours rest between shifts (${restHours.toFixed(1)}h)`
      });
    }
  }
  
  // Check availability
  const availabilityCheck = checkAvailability(user, shift);
  if (!availabilityCheck.available) {
    violations.push({
      rule: 'outside_availability',
      msg: availabilityCheck.msg
    });
  }
  
  // Check weekly hours and overtime
  const weekStart = DateTime.fromJSDate(shift.startUtc).startOf('week');
  const weekEnd = weekStart.plus({ weeks: 1 });
  
  const weeklyShifts = await Shift.find({
    assigned: userId,
    _id: { $ne: shiftId },
    startUtc: { $gte: weekStart.toJSDate(), $lt: weekEnd.toJSDate() }
  });
  
  let weeklyHours = weeklyShifts.reduce((total, s) => {
    return total + DateTime.fromJSDate(s.endUtc).diff(DateTime.fromJSDate(s.startUtc), 'hours').hours;
  }, 0);
  
  const shiftHours = DateTime.fromJSDate(shift.endUtc).diff(DateTime.fromJSDate(shift.startUtc), 'hours').hours;
  weeklyHours += shiftHours;
  
  if (weeklyHours >= OVERTIME_HIGHLIGHT_HOURS) {
    violations.push({
      rule: 'overtime_exceeded',
      msg: `Weekly hours would be ${weeklyHours.toFixed(1)}h (threshold: ${OVERTIME_HIGHLIGHT_HOURS}h)`,
      severity: 'high'
    });
  } else if (weeklyHours >= OVERTIME_WARNING_HOURS) {
    violations.push({
      rule: 'overtime_warning',
      msg: `Weekly hours would be ${weeklyHours.toFixed(1)}h (warning at ${OVERTIME_WARNING_HOURS}h)`,
      severity: 'warning'
    });
  }
  
  // Check daily hours
  const dayStart = DateTime.fromJSDate(shift.startUtc).startOf('day');
  const dayEnd = dayStart.plus({ days: 1 });
  
  const dailyShifts = await Shift.find({
    assigned: userId,
    _id: { $ne: shiftId },
    startUtc: { $gte: dayStart.toJSDate(), $lt: dayEnd.toJSDate() }
  });
  
  let dailyHours = dailyShifts.reduce((total, s) => {
    return total + DateTime.fromJSDate(s.endUtc).diff(DateTime.fromJSDate(s.startUtc), 'hours').hours;
  }, 0);
  
  dailyHours += shiftHours;
  
  if (dailyHours > MAX_DAILY_HOURS) {
    violations.push({
      rule: 'max_daily_hours',
      msg: `Daily hours would be ${dailyHours.toFixed(1)}h (max: ${MAX_DAILY_HOURS}h)`,
      severity: 'high'
    });
  }
  
  return {
    valid: violations.filter(v => v.severity !== 'warning').length === 0,
    violations,
    weeklyHours: weeklyHours.toFixed(1)
  };
};

export const checkAvailability = (user, shift) => {
  const shiftStart = DateTime.fromJSDate(shift.startUtc).setZone(shift.locationId.timezone);
  const shiftEnd = DateTime.fromJSDate(shift.endUtc).setZone(shift.locationId.timezone);
  
  // Check one-off exceptions first
  for (const avail of user.availability.filter(a => a.type === 'one-off')) {
    if (avail.startDatetime && avail.endDatetime) {
      const availStart = DateTime.fromISO(avail.startDatetime);
      const availEnd = DateTime.fromISO(avail.endDatetime);
      
      if (shiftStart >= availStart && shiftEnd <= availEnd) {
        return { available: true };
      }
    }
  }
  
  // Check recurring availability
  const dayOfWeek = shiftStart.weekday % 7; // Convert to 0-6 (Sun-Sat)
  
  for (const avail of user.availability.filter(a => a.type === 'recurring')) {
    if (avail.dayOfWeek === dayOfWeek) {
      const [availStartHour, availStartMin] = avail.startTime.split(':').map(Number);
      const [availEndHour, availEndMin] = avail.endTime.split(':').map(Number);
      
      const availStart = shiftStart.set({ hour: availStartHour, minute: availStartMin });
      const availEnd = shiftStart.set({ hour: availEndHour, minute: availEndMin });
      
      if (shiftStart >= availStart && shiftEnd <= availEnd) {
        return { available: true };
      }
    }
  }
  
  return {
    available: false,
    msg: `${user.name} is not available during this time`
  };
};

export const getSuggestions = async (shift) => {
  const location = await Location.findById(shift.locationId);
  
  // Find all users certified for this location with the required skill
  const candidates = await User.find({
    certifiedLocations: shift.locationId,
    skills: shift.requiredSkill,
    role: 'staff'
  });
  
  const suggestions = [];
  
  for (const user of candidates) {
    const check = await checkConstraints(shift._id, user._id, shift);
    
    // Only suggest if no hard violations
    const hardViolations = check.violations.filter(v => v.severity !== 'warning');
    
    if (hardViolations.length === 0) {
      // Calculate weekly hours for fairness scoring
      const weekStart = DateTime.fromJSDate(shift.startUtc).startOf('week');
      const weekEnd = weekStart.plus({ weeks: 1 });
      
      const weeklyShifts = await Shift.find({
        assigned: user._id,
        startUtc: { $gte: weekStart.toJSDate(), $lt: weekEnd.toJSDate() }
      });
      
      const weeklyHours = weeklyShifts.reduce((total, s) => {
        return total + DateTime.fromJSDate(s.endUtc).diff(DateTime.fromJSDate(s.startUtc), 'hours').hours;
      }, 0);
      
      suggestions.push({
        userId: user._id,
        name: user.name,
        weeklyHours: weeklyHours.toFixed(1),
        reason: 'Has skill & availability',
        warnings: check.violations.filter(v => v.severity === 'warning')
      });
    }
  }
  
  // Sort by weekly hours (fairness - assign to those with fewer hours)
  suggestions.sort((a, b) => parseFloat(a.weeklyHours) - parseFloat(b.weeklyHours));
  
  return suggestions.slice(0, 5);
};
