# ShiftSync - Staff Scheduling Application

A comprehensive web application for managing multi-location staff schedules with real-time collaboration, constraint enforcement, and analytics.

## Features

### Core Scheduling
- ✅ Multi-location support with timezone handling
- ✅ Shift creation and management
- ✅ Staff assignment with constraint validation
- ✅ Schedule publishing/unpublishing
- ✅ Drag-and-drop interface (planned)

### Constraint Engine
- ✅ No overlapping shifts
- ✅ Minimum rest period (10 hours)
- ✅ Skill and certification checks
- ✅ Availability window validation
- ✅ Overtime warnings and limits
- ✅ Daily and weekly hour limits
- ✅ Intelligent staff suggestions

### Swap/Drop System
- ✅ Swap requests between staff
- ✅ Drop shift requests
- ✅ Pickup available shifts
- ✅ Manager approval workflow
- ✅ Auto-expiration (24h before shift)
- ✅ Limit of 3 pending requests per staff

### Real-time Features
- ✅ Socket.IO integration
- ✅ Live shift updates
- ✅ Conflict notifications
- ✅ Real-time notifications
- ✅ On-duty status tracking

### Analytics & Reporting
- ✅ Overtime tracking
- ✅ Fairness analytics
- ✅ Hours distribution charts
- ✅ Audit trail with CSV export
- ✅ Weekly/monthly reports

### Security & Access Control
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (Admin/Manager/Staff)
- ✅ Location-based permissions
- ✅ Audit logging for all actions

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO for real-time
- JWT for authentication
- Luxon for timezone handling
- Node-cron for background jobs
- Joi for validation

### Frontend
- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Query for data fetching
- React Router for navigation
- Recharts for analytics
- Socket.IO client
- Luxon for dates

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ShiftSync
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Configure environment variables:

Backend `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/shiftsync
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

Frontend `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

### Running the Application

1. Start MongoDB (if running locally):
```bash
mongod
```

2. Seed the database:
```bash
cd backend
npm run seed
```

3. Start the backend server:
```bash
npm run dev
```

4. In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```

5. Open your browser to `http://localhost:5173`

## Demo Credentials

After running the seed script, use these credentials:

### Admin
- Email: `admin@shiftsync.com`
- Password: `admin123`

### Managers
- Email: `manager.west@shiftsync.com` / Password: `manager123`
- Email: `manager.east@shiftsync.com` / Password: `manager123`

### Staff
- Email: `alice@shiftsync.com` / Password: `staff123`
- Email: `john@shiftsync.com` / Password: `staff123`
- Email: `maria@shiftsync.com` / Password: `staff123`
- Email: `sarah@shiftsync.com` / Password: `staff123`

## Evaluation Scenarios

### 1. Sunday Night Chaos
**Scenario**: Manager needs to quickly fill an open bartender shift on Sunday evening.

**Steps**:
1. Login as `manager.west@shiftsync.com`
2. Navigate to Schedule
3. Select "Coastal Eats - West" location
4. Find the Sunday evening shift (19:00-23:00)
5. System shows suggestions sorted by fairness
6. Assign staff with one click
7. Real-time notification sent to assigned staff

**Expected**: Assignment completes in <30 seconds with constraint validation.

### 2. Overtime Trap
**Scenario**: Attempting to assign staff who would exceed 40 hours/week.

**Steps**:
1. Login as manager
2. Try to assign Alice (who already has 32+ hours) to additional shifts
3. System shows overtime warning at 35h
4. System highlights violation at 40h
5. View "what-if" projection showing weekly hours

**Expected**: Clear warnings with exact hour counts and suggestions for alternatives.

### 3. Timezone Tangle
**Scenario**: Staff availability across different timezones.

**Steps**:
1. Login as manager
2. View John's availability (certified for both West and East locations)
3. Create shift at East location (America/New_York)
4. System correctly converts John's availability to location timezone
5. Assignment succeeds only if within availability window

**Expected**: Correct timezone conversion with no manual calculation needed.

### 4. Simultaneous Assignment
**Scenario**: Two managers try to assign the same staff to different shifts.

**Steps**:
1. Open two browser windows
2. Login as different managers in each
3. Both try to assign Sarah to overlapping shifts simultaneously
4. First assignment succeeds
5. Second gets immediate 409 Conflict response
6. Real-time notification shows conflict to second manager

**Expected**: One succeeds, other gets conflict with suggestions.

### 5. Fairness Complaint
**Scenario**: Staff member claims unfair shift distribution.

**Steps**:
1. Login as manager
2. Navigate to Analytics
3. Select location and date range
4. View fairness distribution chart
5. See hours per staff member
6. View premium shift counts (weekends/nights)
7. Export data as CSV

**Expected**: Clear visualization showing actual vs desired hours.

### 6. Regret Swap
**Scenario**: Staff initiates swap then wants to cancel.

**Steps**:
1. Login as Alice (staff)
2. Navigate to Swaps
3. View pending drop request for Sunday shift
4. Click cancel before manager approval
5. Shift returns to normal state
6. Audit log records the cancellation

**Expected**: Clean cancellation with audit trail.

## API Documentation

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users (admin/manager)
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/certify` - Certify for location

### Locations
- `GET /api/locations` - List locations
- `POST /api/locations` - Create location (admin)
- `PUT /api/locations/:id` - Update location (admin)

### Shifts
- `GET /api/shifts` - List shifts (with filters)
- `POST /api/shifts` - Create shift
- `POST /api/shifts/:id/assign` - Assign staff
- `POST /api/shifts/:id/unassign` - Unassign staff
- `POST /api/shifts/publish` - Publish schedule

### Swaps
- `GET /api/swaps` - List swap requests
- `POST /api/swaps` - Create swap request
- `POST /api/swaps/:id/accept` - Accept swap
- `POST /api/swaps/:id/manager-approve` - Manager approve
- `POST /api/swaps/:id/cancel` - Cancel swap

### Analytics
- `GET /api/analytics/overtime` - Overtime analysis
- `GET /api/analytics/fairness` - Fairness distribution

### Audit
- `GET /api/audit` - Audit logs (with CSV export)

## Architecture Decisions

### Timezone Handling
- All shift times stored as UTC in database
- Location timezone stored as IANA string
- Conversion happens at display time using Luxon
- Availability stored as local times with day-of-week

### Constraint Enforcement
- Validation runs on every assignment attempt
- Checks performed in order: certification → skill → overlap → rest → availability → overtime
- Warnings (35-40h) vs hard blocks (>40h or >12h/day)
- Suggestions engine ranks by fairness (lowest weekly hours first)

### Concurrency Control
- MongoDB transactions for atomic operations
- Optimistic locking with version field
- Socket.IO for real-time conflict notifications
- 409 Conflict responses with latest state

### Consecutive Days Policy
- Any day with >0 minutes worked counts as worked day
- Configurable threshold (default: 6 consecutive days)
- Documented in constraint engine

## Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend tests:
```bash
cd frontend
npm test
```

## Deployment

### Backend (Heroku/Render)
1. Set environment variables
2. Connect MongoDB Atlas
3. Deploy from Git
4. Run seed script

### Frontend (Vercel/Netlify)
1. Set VITE_API_URL to production backend
2. Deploy from Git
3. Auto-deploys on push

## Known Limitations

1. Drag-and-drop scheduling UI not yet implemented (basic UI provided)
2. Email notifications use simulated SMTP (configure real SMTP for production)
3. File uploads (Cloudinary) configured but not fully integrated in UI
4. Mobile responsiveness needs improvement
5. Advanced analytics (cost projections) partially implemented

## Future Enhancements

- Mobile app (React Native)
- Advanced drag-and-drop scheduler
- Shift templates and recurring schedules
- Time-off request system
- Payroll integration
- SMS notifications
- Multi-language support
- Dark mode

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact support@shiftsync.com
