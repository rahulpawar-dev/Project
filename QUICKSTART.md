# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Start MongoDB
```bash
# If MongoDB is installed locally
mongod
```

Or use MongoDB Atlas (Cloud):
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a cluster and get connection string
- Update MONGODB_URI in backend/.env

### Step 2: Start Backend Server
```bash
cd backend
npm install
npm run dev
```
✅ Backend running on http://localhost:5000

Optional for Google login: add `GOOGLE_CLIENT_ID=your_google_oauth_client_id` in `backend/.env`.

### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend running on http://localhost:3000

Optional: copy `frontend/.env.example` to `frontend/.env` and set:
```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```
Without `VITE_GOOGLE_MAPS_API_KEY`, nearby hospital search still works from Super Admin hospital coordinates, but embedded map preview stays disabled.

### Step 4: Test the Application

#### Create a Patient Account
1. Go to http://localhost:3000
   - You can explore the public homepage tools (patient wait planner, doctor discovery, images/videos, and 3D activity cards) without login.
2. On the public homepage, click "Login / Register"
3. Click "Register"
4. Fill in:
   - Name: Test Patient
   - Email: patient@test.com
   - Password: password123
   - Role: Patient
   - Phone: 9876543210
5. Click Register

#### Login with Google
1. Open Login page (`/auth`)
2. Click **Continue with Google**
3. Complete Google sign-in
4. You will be redirected to your dashboard (new Google users are created as Patient role)

#### Create Staff Accounts from Registration
Use the same registration form and select role as:
- Attendant
- Doctor
- Reception
- Admin
- Super Admin
- Add Hospital Name for Attendant, Reception, and Admin
- Note: only one Admin can be created per hospital
- Note: maximum five Super Admin accounts can be created

### Step 5: Use the Application

**As Patient:**
- Join Queue → Select Department → Check waiting position
- Book Appointment → Select date and available time slot
- View appointment history

**As Attendant:**
- View patients in queue
- Click "Start" when ready to serve
- Click "Done" when finished
- Change patient priority

**As Doctor:**
- View patients in queue
- Start and complete consultations
- Update priority when needed

**As Reception:**
- Book appointments for patients
- View all appointments for today
- Cancel appointments
- Monitor real-time statistics
- Add doctors and reception staff for each hospital from Hospital Staff Directory section
- Add staff profile image using image URL or file upload

**As Admin:**
- Open Admin Dashboard
- Login with your hospital name
- Add or remove doctors and reception staff entries for your hospital
- Add staff profile image using image URL or file upload

**As Super Admin:**
- Open Super Admin Dashboard
- Add new hospitals to the global catalog with latitude and longitude
- Delete hospitals from the catalog (linked hospital staff entries are removed)

## 📊 API Testing with Postman

### 1. Register User
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@test.com",
  "password": "password123",
  "role": "patient",
  "phone": "1234567890",
  "department": "General"
}
```

### 2. Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@test.com",
  "password": "password123"
}
```

### 2.1 Google Login
```
POST http://localhost:5000/api/auth/google
Content-Type: application/json

{
  "credential": "GOOGLE_ID_TOKEN_FROM_CLIENT"
}
```

### 3. Join Queue
```
POST http://localhost:5000/api/queue/join
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "department": "Cardiology"
}
```

### 4. Get Queue Status
```
GET http://localhost:5000/api/queue/patient/PATIENT_ID
Authorization: Bearer YOUR_TOKEN
```

### 5. Create Appointment
```
POST http://localhost:5000/api/appointments
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "patientId": "PATIENT_ID",
  "department": "Cardiology",
  "appointmentDate": "2024-03-25",
  "timeSlot": "09:30 AM",
  "reason": "Checkup",
  "priority": "routine"
}
```

## 🔧 Useful Commands

### Backend
```bash
npm start         # Production mode
npm run dev       # Development mode with auto-reload
```

### Frontend
```bash
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
```

## 📁 Project Structure
```
mediqueue/
├── backend/
│   ├── controllers/      # Business logic
│   ├── models/          # Database schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & validation
│   ├── server.js        # Main server file
│   ├── .env             # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Dashboard pages
│   │   ├── context/     # Zustand store
│   │   ├── utils/       # API calls
│   │   ├── App.jsx      # Main app
│   │   └── main.jsx     # Entry point
│   ├── index.html       # HTML template
│   ├── vite.config.js   # Vite config
│   └── package.json
└── README.md
```

## 🐛 Common Issues & Solutions

### Issue: "Cannot GET /api/auth/login"
- Make sure backend is running on port 5000
- Check if MongoDB connection is successful

### Issue: Google login button not visible
- Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`
- Restart frontend after updating `.env`

### Issue: CORS Error in Frontend
- Verify backend CORS settings allow localhost:3000
- Clear browser cache and cookies

### Issue: Queue doesn't update in real-time
- Check browser console for Socket.io errors
- Ensure both frontend and backend are running
- Try refreshing the page

### Issue: MongoDB Connection Failed
- Start MongoDB: `mongod`
- Check .env MONGODB_URI
- Verify MongoDB is running on port 27017

## 📚 Next Steps

1. **Customize Departments** - Edit department list in models/User.js
2. **Add Real-time Updates** - Enhance Socket.io implementation
3. **Implement SMS Notifications** - Use Twilio or Firebase
4. **Add Payment Integration** - Stripe or PayPal
5. **Deploy** - Use Heroku, AWS, or DigitalOcean

## 🎯 Features Checklist

- ✅ User authentication with JWT
- ✅ Role-based access control (Patient, Attendant, Reception)
- ✅ Real-time queue management
- ✅ Appointment booking system
- ✅ Time slot management
- ✅ Patient priority system
- ✅ Dashboard statistics
- ✅ Auto-refresh queue every 3 seconds
- ✅ Responsive design
- ✅ Protected API routes

## 💡 Pro Tips

1. Use different terminals for backend and frontend
2. Keep backend running throughout development
3. Clear browser cache if styles don't update
4. Check browser console (F12) for errors
5. Use Postman to test API before frontend
6. Monitor MongoDB with MongoDB Compass

## 🚀 Ready to Deploy?

Check the main README.md for deployment instructions and production setup.

Happy coding! 🎉
