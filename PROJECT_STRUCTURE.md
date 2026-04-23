# 🏥 MediQueue - Complete Setup

## Project Created Successfully! ✅

Your complete MERN stack MediQueue project has been created in:
```
c:\Users\Rahul Pawar\OneDrive\Desktop\DSA\mediqueue\
```

---

## 📋 Project Structure

```
mediqueue/
│
├── backend/
│   ├── controllers/
│   │   ├── authController.js       (Login, Register, Auth logic)
│   │   ├── queueController.js      (Queue management logic)
│   │   └── appointmentController.js (Appointment logic)
│   │
│   ├── models/
│   │   ├── User.js                 (User schema - patient, doctor, attendant, reception, admin, super-admin)
│   │   ├── Queue.js                (Queue management schema)
│   │   └── Appointment.js          (Appointment booking schema)
│   │
│   ├── routes/
│   │   ├── auth.js                 (Authentication endpoints)
│   │   ├── queue.js                (Queue management endpoints)
│   │   └── appointments.js         (Appointment endpoints)
│   │
│   ├── middleware/
│   │   └── auth.js                 (JWT verification & role authorization)
│   │
│   ├── server.js                   (Main Express server with Socket.io)
│   ├── .env                        (Environment configuration)
│   └── package.json                (Dependencies)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth.jsx            (Login & Registration page)
│   │   │   ├── Auth.css
│   │   │   ├── PatientDashboard.jsx (Patient dashboard)
│   │   │   ├── PatientDashboard.css
│   │   │   ├── AttendantDashboard.jsx (Staff dashboard)
│   │   │   ├── AttendantDashboard.css
│   │   │   ├── ReceptionDashboard.jsx (Reception dashboard)
│   │   │   ├── AdminDashboard.css
│   │   │   ├── AdminDashboard.jsx     (Hospital admin dashboard)
│   │   │   ├── SuperAdminDashboard.css
│   │   │   ├── SuperAdminDashboard.jsx (Global hospital catalog dashboard)
│   │   │   └── ReceptionDashboard.css
│   │   │
│   │   ├── components/             (Reusable components - ready for expansion)
│   │   │
│   │   ├── context/
│   │   │   └── store.js            (Zustand state management)
│   │   │
│   │   ├── utils/
│   │   │   ├── api.js              (Axios API calls)
│   │   │   └── hospitalDirectory.js (Demo hospital/staff catalog helpers)
│   │   │
│   │   ├── App.jsx                 (Main App with routing)
│   │   ├── App.css                 (Global styles)
│   │   └── main.jsx                (Vite entry point)
│   │
│   ├── index.html                  (HTML template)
│   ├── vite.config.js              (Vite configuration)
│   └── package.json                (Dependencies)
│
├── README.md                        (Complete documentation)
├── QUICKSTART.md                    (Quick start guide)
├── package.json                     (Root package for easy management)
└── .gitignore                       (Git ignore file)
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd c:\Users\Rahul Pawar\OneDrive\Desktop\DSA\mediqueue

# Install all dependencies (backend + frontend)
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Start MongoDB
Make sure MongoDB is running:
```bash
mongod
```

Or use MongoDB Atlas (Cloud) - update .env accordingly

### 3. Start Backend Server
```bash
cd backend
npm run dev
```
✅ Server running on http://localhost:5000

### 4. Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```
✅ App running on http://localhost:3000

---

## 🔐 Authentication Features

### JWT Token-based Authentication
- 30-day token expiration
- Password hashing with bcryptjs (10 rounds)
- Protected API routes with role-based access
- Error handling and validation

### User Roles
1. **Patient** - Can join queue and book appointments
2. **Doctor** - Can manage operational queue actions
3. **Attendant** - Can manage queue and serve patients
4. **Reception** - Can book appointments and manage hospital operations
5. **Admin** - Can manage hospital staff directory data across hospitals

---

## 📊 Key Features Implemented

### ✅ Patient Portal
- Register and login
- Join queue for specific departments
- View real-time queue position and wait times
- Book appointments with available time slots
- Cancel appointments
- View appointment history
- Real-time status updates

### ✅ Attendant Dashboard
- View assigned department queue
- Start/complete patient consultations
- Update patient priority (Low, Medium, High)
- Real-time statistics
- Auto-refresh every 3 seconds

### ✅ Reception Dashboard
- Book appointments for patients
- View appointments by date and department
- Manage overall queue statistics
- Cancel appointments
- Real-time updates
- Multi-department view

### ✅ Database Features
- MongoDB with Mongoose
- Indexed queries for performance
- Data validation
- Aggregation pipelines for statistics
- Relationships between collections

### ✅ Real-time Features
- Socket.io implementation
- Queue updates broadcast to all clients
- Status change notifications
- Live statistics updates

---

## 🔌 API Endpoints Summary

### Authentication
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | Public | Create new account |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Private | Get profile |
| POST | `/api/auth/logout` | Private | Logout |

### Queue Management
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/api/queue/join` | Patient | Join queue |
| GET | `/api/queue/department/:dept` | Attendant/Rec | View queue |
| GET | `/api/queue/patient/:id` | Patient | Check status |
| PUT | `/api/queue/:id/status` | Attendant | Update status |
| DELETE | `/api/queue/:id` | Patient | Leave queue |
| GET | `/api/queue/stats/dashboard` | All | Get stats |

### Appointments
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/api/appointments` | Patient/Rec | Create appointment |
| GET | `/api/appointments/patient/:id` | Patient | View appointments |
| GET | `/api/appointments/dept/:dept` | Attendant/Rec | Department appointments |
| PUT | `/api/appointments/:id` | Patient/Rec | Update appointment |
| DELETE | `/api/appointments/:id` | Patient/Rec | Cancel appointment |
| GET | `/api/appointments/slots/:dept/:date` | All | Get available slots |

---

## 🗄️ Database Models

### User Model
```
- name (String)
- email (String - unique)
- password (String - hashed)
- role (patient/doctor/attendant/reception/admin/super-admin)
- phone (String)
- department (String)
- hospitalName (String)
- isActive (Boolean)
- totalVisits (Number)
```

### Queue Model
```
- patientId (Reference)
- patientName (String)
- department (String)
- status (waiting/in-progress/completed/cancelled)
- queuePosition (Number)
- priority (low/medium/high)
- estimatedWaitTime (Number in minutes)
- checkInTime (Date)
- totalWaitTime (Number)
- attendantId (Reference)
```

### Appointment Model
```
- patientId (Reference)
- department (String)
- appointmentDate (Date)
- timeSlot (String)
- status (scheduled/completed/cancelled/no-show)
- reason (String)
- priority (routine/urgent/emergency)
- attendantId (Reference)
```

---

## 🔒 Security Implementation

✅ **JWT Authentication** - Secure token-based auth
✅ **Password Hashing** - bcryptjs with 10 salt rounds
✅ **Role-based Access Control** - Fine-grained permissions
✅ **Protected Routes** - Middleware validation
✅ **CORS** - Cross-origin configuration
✅ **Input Validation** - Mongoose schema validation
✅ **Error Handling** - Comprehensive error responses

---

## 💄 UI/UX Features

✅ **Responsive Design** - Mobile, tablet, desktop
✅ **Modern Styling** - Gradient backgrounds, smooth animations
✅ **Color-coded Status** - Easy queue status identification
✅ **Real-time Refresh** - Auto-updates every 3 seconds
✅ **Modal Forms** - Clean modal dialogs
✅ **Loading States** - User feedback
✅ **Error Messages** - Clear error display
✅ **Professional Layout** - Navigation bar, organized content

---

## 📱 Department Support

Configured departments:
- General (Default)
- Cardiology
- Neurology
- Orthopedics
- Pediatrics

(Easily customizable in models/User.js)

---

## 🎯 Testing Credentials

### Create Test Patient
1. Go to http://localhost:3000
2. Click "Register"
3. Fill in the form with role "patient"
4. Login with created credentials

### Create Test Attendant
Register through UI with role "attendant" OR manually create in MongoDB

### Create Test Reception
Similar to attendant with role "reception"

### Create Test Admin
- Register through UI with role "admin"
- Provide hospital name during registration
- Only one admin account can be created per hospital

### Create Test Super Admin
- Register through UI with role "super-admin"
- No hospital name required
- Maximum five super-admin accounts can be created

---

## 🛠️ Technology Stack

### Backend
- **Node.js** v14+
- **Express.js** 4.18
- **MongoDB** (local or Atlas)
- **Mongoose** 7.5
- **JWT** 9.1
- **bcryptjs** 2.4
- **Socket.io** 4.7
- **CORS** 2.8

### Frontend
- **React** 18.2
- **React Router** 6.16
- **Vite** 5.0
- **Axios** 1.5
- **Zustand** 4.4
- **Socket.io Client** 4.7
- **CSS3** (Custom styling)

---

## 📚 Documentation Files

1. **README.md** - Complete project documentation
2. **QUICKSTART.md** - 5-minute quick start guide
3. **PROJECT_STRUCTURE.md** - This file

---

## 🔄 Real-time Communication

Socket.io events configured:
- `queue-update` - Queue changes
- `patient-checkin` - Patient check-in
- `status-change` - Status updates
- Broadcasting to all connected clients

---

## ⚙️ Environment Variables

Backend `.env` file includes:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mediqueue
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345
NODE_ENV=development
```

---

## 🚀 Deployment Ready

This project is ready for deployment to:
- Heroku
- AWS
- DigitalOcean
- Azure
- Google Cloud

Just configure environment variables and database connection.

---

## 📝 Next Steps

1. ✅ **Install Dependencies** - Run npm install in backend and frontend
2. ✅ **Configure MongoDB** - Local or Atlas
3. ✅ **Start Servers** - Backend and Frontend
4. ✅ **Test Application** - Create accounts and test features
5. ✅ **Customize** - Adjust departments, dashboard layouts, etc.
6. ✅ **Deploy** - Push to production

---

## 🎉 Features Checklist

- ✅ Complete authentication system with JWT
- ✅ Role-based dashboards (Patient, Attendant/Doctor, Reception, Admin)
- ✅ Real-time queue management
- ✅ Appointment booking with available slots
- ✅ Patient priority system
- ✅ Real-time statistics
- ✅ Responsive UI design
- ✅ Protected API routes
- ✅ Database indexing for performance
- ✅ Socket.io for real-time updates
- ✅ Error handling and validation
- ✅ Professional UI/UX
- ✅ Complete documentation
- ✅ Quick start guide

---

## 📞 Support

If you encounter any issues:
1. Check QUICKSTART.md for common problems
2. Review README.md for API documentation
3. Check browser console (F12) for errors
4. Ensure all services are running (MongoDB, Backend, Frontend)

---

## 🎓 Learning Resources

This project demonstrates:
- MERN stack full-stack development
- JWT authentication
- Role-based access control
- Real-time features with Socket.io
- React hooks and state management
- Express middleware
- MongoDB aggregation
- RESTful API design
- Responsive CSS design

---

**Project Created Successfully! 🎉**

Start building your hospital queue management system now!

Happy Coding! 💻✨
