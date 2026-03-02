import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import User from '../models/User.js';
import Location from '../models/Location.js';
import Shift from '../models/Shift.js';
import SwapRequest from '../models/SwapRequest.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing data
    if (process.argv.includes('--reset')) {
      await User.deleteMany({});
      await Location.deleteMany({});
      await Shift.deleteMany({});
      await SwapRequest.deleteMany({});
      await AuditLog.deleteMany({});
      console.log('✅ Database cleared');
    }
    
    // Create locations
    const locations = await Location.insertMany([
      { name: 'Coastal Eats - West', address: '123 Beach Blvd, LA', timezone: 'America/Los_Angeles' },
      { name: 'Coastal Eats - East', address: '456 Harbor St, NYC', timezone: 'America/New_York' },
      { name: 'Coastal Eats - Central', address: '789 Lake Ave, Chicago', timezone: 'America/Chicago' },
      { name: 'Coastal Eats - Mountain', address: '321 Peak Rd, Denver', timezone: 'America/Denver' }
    ]);
    console.log('✅ Created 4 locations');
    
    // Create admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@shiftsync.com',
      passwordHash: 'admin123',
      role: 'admin'
    });
    
    // Create managers
    const manager1 = await User.create({
      name: 'Manager West',
      email: 'manager.west@shiftsync.com',
      passwordHash: 'manager123',
      role: 'manager',
      managedLocations: [locations[0]._id, locations[1]._id]
    });
    
    const manager2 = await User.create({
      name: 'Manager East',
      email: 'manager.east@shiftsync.com',
      passwordHash: 'manager123',
      role: 'manager',
      managedLocations: [locations[2]._id, locations[3]._id]
    });
    
    // Create staff
    const alice = await User.create({
      name: 'Alice Johnson',
      email: 'alice@shiftsync.com',
      passwordHash: 'staff123',
      role: 'staff',
      skills: ['bartender', 'server'],
      certifiedLocations: [locations[0]._id],
      desiredHoursPerWeek: 35,
      availability: [
        { type: 'recurring', dayOfWeek: 1, startTime: '16:00', endTime: '23:00' },
        { type: 'recurring', dayOfWeek: 2, startTime: '16:00', endTime: '23:00' },
        { type: 'recurring', dayOfWeek: 3, startTime: '16:00', endTime: '23:00' },
        { type: 'recurring', dayOfWeek: 4, startTime: '16:00', endTime: '23:00' },
        { type: 'recurring', dayOfWeek: 5, startTime: '16:00', endTime: '23:00' }
      ]
    });
    
    const john = await User.create({
      name: 'John Smith',
      email: 'john@shiftsync.com',
      passwordHash: 'staff123',
      role: 'staff',
      skills: ['line_cook', 'prep_cook'],
      certifiedLocations: [locations[0]._id, locations[1]._id],
      desiredHoursPerWeek: 40,
      availability: [
        { type: 'recurring', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { type: 'recurring', dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { type: 'recurring', dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
        { type: 'recurring', dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
        { type: 'recurring', dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }
      ]
    });
    
    const maria = await User.create({
      name: 'Maria Garcia',
      email: 'maria@shiftsync.com',
      passwordHash: 'staff123',
      role: 'staff',
      skills: ['server', 'host'],
      certifiedLocations: [locations[1]._id],
      desiredHoursPerWeek: 25,
      availability: [
        { type: 'recurring', dayOfWeek: 5, startTime: '17:00', endTime: '23:00' },
        { type: 'recurring', dayOfWeek: 6, startTime: '17:00', endTime: '23:00' },
        { type: 'recurring', dayOfWeek: 0, startTime: '17:00', endTime: '23:00' }
      ]
    });
    
    const sarah = await User.create({
      name: 'Sarah Williams',
      email: 'sarah@shiftsync.com',
      passwordHash: 'staff123',
      role: 'staff',
      skills: ['server', 'bartender'],
      certifiedLocations: [locations[0]._id],
      desiredHoursPerWeek: 30,
      availability: [
        { type: 'recurring', dayOfWeek: 0, startTime: '10:00', endTime: '18:00' },
        { type: 'recurring', dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
        { type: 'recurring', dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
        { type: 'recurring', dayOfWeek: 3, startTime: '10:00', endTime: '18:00' }
      ]
    });
    
    console.log('✅ Created users (1 admin, 2 managers, 4 staff)');
    
    // Create shifts for next week
    const nextSunday = DateTime.now().setZone(locations[0].timezone).plus({ weeks: 1 }).startOf('week');
    
    const shifts = [];
    
    // Sunday evening shift at West location
    const sundayShift = await Shift.create({
      locationId: locations[0]._id,
      startUtc: nextSunday.set({ hour: 19 }).toUTC().toJSDate(),
      endUtc: nextSunday.set({ hour: 23 }).toUTC().toJSDate(),
      requiredSkill: 'bartender',
      headcount: 2,
      assigned: [alice._id],
      published: true,
      createdBy: manager1._id
    });
    shifts.push(sundayShift);
    
    // Overnight shift (edge case)
    const overnightShift = await Shift.create({
      locationId: locations[0]._id,
      startUtc: nextSunday.plus({ days: 1 }).set({ hour: 23 }).toUTC().toJSDate(),
      endUtc: nextSunday.plus({ days: 2 }).set({ hour: 3 }).toUTC().toJSDate(),
      requiredSkill: 'line_cook',
      headcount: 1,
      assigned: [],
      published: false,
      createdBy: manager1._id
    });
    shifts.push(overnightShift);
    
    // Create conflicting shifts for Sarah (testing violation)
    const conflictShift1 = await Shift.create({
      locationId: locations[0]._id,
      startUtc: nextSunday.plus({ days: 2 }).set({ hour: 10 }).toUTC().toJSDate(),
      endUtc: nextSunday.plus({ days: 2 }).set({ hour: 14 }).toUTC().toJSDate(),
      requiredSkill: 'server',
      headcount: 1,
      assigned: [sarah._id],
      published: true,
      createdBy: manager1._id
    });
    shifts.push(conflictShift1);
    
    const conflictShift2 = await Shift.create({
      locationId: locations[0]._id,
      startUtc: nextSunday.plus({ days: 2 }).set({ hour: 12 }).toUTC().toJSDate(),
      endUtc: nextSunday.plus({ days: 2 }).set({ hour: 16 }).toUTC().toJSDate(),
      requiredSkill: 'server',
      headcount: 1,
      assigned: [],
      published: false,
      createdBy: manager1._id
    });
    shifts.push(conflictShift2);
    
    // More shifts throughout the week
    for (let day = 1; day <= 5; day++) {
      const morningShift = await Shift.create({
        locationId: locations[0]._id,
        startUtc: nextSunday.plus({ days: day }).set({ hour: 9 }).toUTC().toJSDate(),
        endUtc: nextSunday.plus({ days: day }).set({ hour: 17 }).toUTC().toJSDate(),
        requiredSkill: 'line_cook',
        headcount: 2,
        assigned: day <= 3 ? [john._id] : [],
        published: day <= 3,
        createdBy: manager1._id
      });
      shifts.push(morningShift);
      
      const eveningShift = await Shift.create({
        locationId: locations[0]._id,
        startUtc: nextSunday.plus({ days: day }).set({ hour: 17 }).toUTC().toJSDate(),
        endUtc: nextSunday.plus({ days: day }).set({ hour: 23 }).toUTC().toJSDate(),
        requiredSkill: 'bartender',
        headcount: 2,
        assigned: day <= 2 ? [alice._id] : [],
        published: day <= 2,
        createdBy: manager1._id
      });
      shifts.push(eveningShift);
    }
    
    console.log(`✅ Created ${shifts.length} shifts`);
    
    // Create a pending swap request
    const swapRequest = await SwapRequest.create({
      type: 'drop',
      shiftId: sundayShift._id,
      requesterId: alice._id,
      status: 'pending',
      expiresAt: nextSunday.set({ hour: 19 }).minus({ hours: 24 }).toJSDate(),
      notes: 'Family emergency'
    });
    
    sundayShift.pendingSwap = swapRequest._id;
    await sundayShift.save();
    
    console.log('✅ Created swap request');
    
    // Create audit logs
    await AuditLog.create({
      actorId: manager1._id,
      action: 'shift.create',
      targetType: 'Shift',
      targetId: sundayShift._id,
      after: sundayShift.toObject(),
      timestamp: new Date()
    });
    
    await AuditLog.create({
      actorId: manager1._id,
      action: 'shift.assign',
      targetType: 'Shift',
      targetId: sundayShift._id,
      metadata: { userId: alice._id },
      timestamp: new Date()
    });
    
    console.log('✅ Created audit logs');
    
    console.log('\n📋 SEED DATA SUMMARY');
    console.log('===================');
    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@shiftsync.com / admin123');
    console.log('Manager West: manager.west@shiftsync.com / manager123');
    console.log('Manager East: manager.east@shiftsync.com / manager123');
    console.log('Staff Alice: alice@shiftsync.com / staff123');
    console.log('Staff John: john@shiftsync.com / staff123');
    console.log('Staff Maria: maria@shiftsync.com / staff123');
    console.log('Staff Sarah: sarah@shiftsync.com / staff123');
    console.log('\n📍 Locations: 4 (West, East, Central, Mountain)');
    console.log(`📅 Shifts: ${shifts.length} (next week)`);
    console.log('🔄 Swap Requests: 1 pending');
    console.log('\n✅ Seed completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
