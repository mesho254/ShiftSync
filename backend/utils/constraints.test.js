// Example test file for constraint checking
// Run with: npm test

import { checkConstraints, checkAvailability } from './constraints.js';

describe('Constraint Checking', () => {
  describe('checkAvailability', () => {
    it('should return available for matching recurring availability', () => {
      const user = {
        availability: [
          {
            type: 'recurring',
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00'
          }
        ]
      };

      const shift = {
        startUtc: new Date('2024-03-04T14:00:00Z'), // Monday 9am PST
        endUtc: new Date('2024-03-04T22:00:00Z'), // Monday 5pm PST
        locationId: {
          timezone: 'America/Los_Angeles'
        }
      };

      const result = checkAvailability(user, shift);
      expect(result.available).toBe(true);
    });

    it('should return unavailable for non-matching availability', () => {
      const user = {
        availability: [
          {
            type: 'recurring',
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00'
          }
        ]
      };

      const shift = {
        startUtc: new Date('2024-03-04T02:00:00Z'), // Sunday 6pm PST
        endUtc: new Date('2024-03-04T06:00:00Z'), // Sunday 10pm PST
        locationId: {
          timezone: 'America/Los_Angeles'
        }
      };

      const result = checkAvailability(user, shift);
      expect(result.available).toBe(false);
    });
  });

  describe('checkConstraints', () => {
    it('should detect overlapping shifts', async () => {
      // Mock data setup
      const shiftId = 'shift123';
      const userId = 'user123';
      
      // This would require mocking Shift.find() to return overlapping shifts
      // Implementation depends on your testing framework (Jest, Mocha, etc.)
      
      // const result = await checkConstraints(shiftId, userId);
      // expect(result.violations).toContainEqual(
      //   expect.objectContaining({ rule: 'double_booked' })
      // );
    });

    it('should detect minimum rest period violations', async () => {
      // Test implementation
    });

    it('should detect missing certifications', async () => {
      // Test implementation
    });

    it('should detect overtime warnings', async () => {
      // Test implementation
    });
  });
});

// To run tests, you would need to:
// 1. Install Jest: npm install --save-dev jest @types/jest
// 2. Configure Jest in package.json
// 3. Mock MongoDB models
// 4. Run: npm test
