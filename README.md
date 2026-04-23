# MediQueue - MERN Stack

A complete real-time healthcare queue platform with role-based dashboards for patients and hospital operations teams. Built with MongoDB, Express.js, React, and Node.js.

## Features

### Public Home Experience
- Public homepage accessible without login
- Patient visit planner with wait-time estimation
- Doctor discovery filters by department and hospital
- Healthcare activity image gallery and demo videos
- Interactive 3D activity cards for quick progress view
- Google login support from the auth page
- Quick path to login or role dashboard

### Patient Dashboard
- Book appointments with hospital-specific doctor selection
- Mandatory payment step before appointment booking
- View current queue status with doctor queue length and estimated wait time
- Cancel appointments
- View appointment history
- Real-time queue status updates
- Nearby hospitals are found from Super Admin managed hospital coordinates and user current location
- Nearby hospital cards show doctor profiles with experience and staff images

### Attendant Dashboard
- View appointments and queue by department/date (auto-locked to login hospital)
- Start/complete patient consultation
- Update patient priority (Low, Medium, High)
- Real-time queue statistics for own hospital
- Auto-refresh queue every 3 seconds

### Reception Dashboard
- Book appointments for patients
- View appointments by date and department (auto-locked to login hospital)
- Manage queue by department for own hospital
- Cancel appointments
- View real-time statistics
- Auto-refresh appointments every 3 seconds
- Add/manage doctors and reception staff only for own hospital
- Add staff profile image using image URL or upload

### Admin Dashboard
- Hospital-based admin access
- Add doctors and reception staff for assigned hospital only
- Remove outdated staff records from assigned hospital directory
- Add staff profile image using image URL or upload

### Super Admin Dashboard
- Global hospital catalog management from one dashboard
- Add new hospitals with departments, wait-time, emergency settings, and map coordinates
- Delete hospitals and clean linked hospital staff directory entries
- Registration is limited to five super-admin accounts

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password encryption
- **Socket.io** - Real-time updates
- **CORS** - Cross-origin requests

### Frontend
- **React** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Zustand** - State management
- **Vite** - Build tool
- **Socket.io Client** - Real-time communication
- **CSS3** - Styling

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mediqueue
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Copy `frontend/.env.example` to `frontend/.env` and set keys:
```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```
If `VITE_GOOGLE_CLIENT_ID` is not set, Google login button is unavailable.
Without `VITE_GOOGLE_MAPS_API_KEY`, nearby hospital search still works using Super Admin hospital coordinates, but embedded map preview is disabled.

4. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (`hospitalName` required for attendant/reception/admin; only one admin per hospital; super-admin capped at 5 accounts)
- `POST /api/auth/login` - Login user (admin must provide matching `hospitalName`)
- `POST /api/auth/google` - Login/register with Google
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

### Queue Management
- `POST /api/queue/join` - Join queue (Patient, paid `payment` payload required)
- `GET /api/queue/department/:department` - Get queue for department (`hospitalName`, `doctorId`, `doctorName` query supported; reception/attendant users are auto-scoped to own hospital)
- `GET /api/queue/patient/:patientId` - Get patient's queue status
- `PUT /api/queue/:queueId/status` - Update queue status (Attendant/Doctor; attendants are restricted to own hospital)
- `PUT /api/queue/:queueId/priority` - Update priority (Reception/Attendant/Doctor; reception/attendants are restricted to own hospital)
- `DELETE /api/queue/:queueId` - Leave queue (reception/attendants restricted to own hospital)
- `GET /api/queue/stats/dashboard` - Get statistics (reception/attendants auto-scoped to own hospital)

### Appointments
- `POST /api/appointments` - Create appointment (Patient requests require paid `payment` payload)
- `GET /api/appointments/patient/:patientId` - Get patient appointments (reception restricted to own hospital records)
- `GET /api/appointments/department/:department` - Get department appointments (`date`, `hospitalName`, `doctorId`, `doctorName` query supported; reception/attendants are auto-scoped to own hospital)
- `PUT /api/appointments/:appointmentId` - Update appointment
- `DELETE /api/appointments/:appointmentId` - Cancel appointment
- `GET /api/appointments/slots/:department/:date` - Get available slots (`hospitalName`, `doctorId`, `doctorName` query supported; reception/attendants are auto-scoped to own hospital)

## User Roles

### Patient
- Register and login
- Book appointments with hospital + doctor selection
- Complete payment before booking/queue confirmation
- View own appointments
- Check doctor queue position and wait time

### Attendant
- Register and login
- Provide hospital name during registration
- View appointments and queue only for own hospital
- Mark patients as in-progress/completed
- Update patient priority
- View real-time statistics for own hospital

### Doctor
- Register and login
- Access the operational queue dashboard
- View queue for department
- Mark patients as in-progress/completed
- Update patient priority

### Reception
- Register and login
- Provide hospital name during registration
- Book appointments for patients
- View appointments by date/department for own hospital
- Manage queue statistics for own hospital
- Cancel appointments
- Add/manage doctors and reception members only for own hospital
- Add staff profile image using image URL or upload

### Admin
- Register and login
- Provide hospital name during registration
- One admin account allowed per hospital
- Login with hospital name verification
- Access hospital-specific admin dashboard
- Add or remove doctor/reception entries for assigned hospital only

### Super Admin
- Register and login
- Access global super-admin dashboard
- Add and delete hospitals from the catalog
- Add latitude/longitude for hospitals so patients can search nearby hospitals
- Maximum five super-admin accounts can be registered

## Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'patient' | 'doctor' | 'attendant' | 'reception' | 'admin' | 'super-admin',
  phone: String,
  department: String,
  hospitalName: String,
  isActive: Boolean,
  totalVisits: Number,
  timestamps: true
}
```

### Queue
```javascript
{
  patientId: ObjectId (ref User),
  patientName: String,
  appointmentId: ObjectId (ref Appointment),
  hospital: { name: String, address: String, phone: String },
  doctor: { id: String, name: String, department: String, experience: String, phone: String, image: String },
  payment: { method: String, amount: Number, currency: String, status: String, transactionId: String, paidAt: Date, payerReference: String },
  department: String,
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled',
  queuePosition: Number,
  priority: 'low' | 'medium' | 'high',
  estimatedWaitTime: Number (minutes),
  checkInTime: Date,
  totalWaitTime: Number (minutes),
  attendantId: ObjectId (ref User),
  completedAt: Date,
  timestamps: true
}
```

### Appointment
```javascript
{
  patientId: ObjectId (ref User),
  hospital: { name: String, address: String, phone: String },
  doctor: { id: String, name: String, department: String, experience: String, phone: String, image: String },
  payment: { method: String, amount: Number, currency: String, status: String, transactionId: String, paidAt: Date, payerReference: String },
  department: String,
  appointmentDate: Date,
  timeSlot: String,
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show',
  reason: String,
  attendantId: ObjectId (ref User),
  priority: 'routine' | 'urgent' | 'emergency',
  timestamps: true
}
```

## Testing the Application

### Test Patient Account
1. Open the public homepage (`http://localhost:3000`) and click "Login / Register"
2. Click "Register"
3. Fill in details:
   - Name: John Doe
   - Email: patient@test.com
   - Password: password123
   - Role: Patient
   - Phone: 1234567890

### Test Staff Accounts (Attendant/Doctor/Reception/Admin/Super Admin)
1. Open "Login / Register" from the homepage
2. Click "Register" and select role from the Role dropdown:
   - Attendant
   - Doctor
   - Reception
   - Admin
   - Super Admin
3. Complete the form and submit
   - Add Hospital Name (required for Attendant/Reception/Admin)
   - Only one Admin account can be created per hospital
   - Maximum five Super Admin accounts can be created

### Test Google Login
1. Set `GOOGLE_CLIENT_ID` in backend `.env`
2. Set `VITE_GOOGLE_CLIENT_ID` in frontend `.env`
3. Open Login page and click the Google button
4. Complete Google sign in; first-time Google users are created as Patient role

## Real-time Features

The application uses Socket.io for real-time updates:
- Queue status changes broadcast to all connected clients
- New patient check-ins update queue positions
- Status changes update dashboard instantly

## Security Features

- JWT authentication with 30-day expiration
- Password hashing with bcryptjs (10 salt rounds)
- Role-based access control (RBAC)
- Protected API routes
- CORS configuration
- Environment variable configuration

## Future Enhancements

- SMS/Email notifications for appointments
- Doctor/staff management
- Patient history and medical records
- Analytics and reporting dashboard
- Video consultation integration
- Payment processing
- Billing system
- Prescription management

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify MongoDB is accessible at localhost:27017

### CORS Error
- Ensure backend is running on port 5000
- Check CORS configuration in server.js
- Clear browser cache

### Socket.io Connection Error
- Verify backend is running
- Check browser console for connection errors
- Ensure correct server URL in frontend

## Authors

Created as a comprehensive MERN stack project demonstrating:
- Full-stack development
- Real-time features
- Role-based access control
- Database modeling
- API design
- React component architecture

## License

MIT License - Free to use and modify for personal and commercial projects.

## Support

For issues, questions, or suggestions, please create an issue in the repository or contact the development team.
