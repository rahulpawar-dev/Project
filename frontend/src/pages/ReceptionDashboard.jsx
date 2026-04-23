import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { queueAPI, appointmentAPI } from '../utils/api';
import { readImageFileAsDataUrl } from '../utils/imageUpload';
import {
  addHospitalStaffEntry,
  getHospitalStaffEntries,
  normalizeHospitalName,
  removeHospitalStaffEntry,
} from '../utils/hospitalDirectory';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import './ReceptionDashboard_Enhanced.css';

export default function ReceptionDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [selectedDept, setSelectedDept] = useState('General');
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBookAppointment, setShowBookAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    department: 'General',
    appointmentDate: '',
    timeSlot: '',
    reason: '',
  });
  const [hospitalStaff, setHospitalStaff] = useState([]);
  const [staffForm, setStaffForm] = useState({
    hospitalName: String(user?.hospitalName || '').trim(),
    role: 'doctor',
    name: '',
    department: 'General',
    experienceYears: '',
    shift: 'Morning Shift',
    phone: '',
    image: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const navigate = useNavigate();
  const userHospitalName = String(user?.hospitalName || '').trim();

  const departments = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'];
  const activeHospitalName = userHospitalName;
  const filteredHospitalStaff = useMemo(() => {
    if (!activeHospitalName) {
      return [];
    }

    const targetHospital = normalizeHospitalName(activeHospitalName);
    return hospitalStaff.filter(
      (entry) => normalizeHospitalName(entry.hospitalName) === targetHospital
    );
  }, [hospitalStaff, activeHospitalName]);

  const refreshHospitalStaffData = useCallback(() => {
    setHospitalStaff(getHospitalStaffEntries());
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'reception') {
      navigate('/');
      return;
    }
    if (!userHospitalName) {
      alert('Your reception account is missing hospital assignment. Please register again.');
      navigate('/auth');
      return;
    }
    const interval = setInterval(() => {
      fetchAppointments();
      fetchQueue();
      fetchStats();
    }, 3000);

    fetchAppointments();
    fetchQueue();
    fetchStats();
    refreshHospitalStaffData();

    return () => clearInterval(interval);
  }, [selectedDept, selectedDate, user, userHospitalName, navigate, refreshHospitalStaffData]);

  useEffect(() => {
    if (activeHospitalName && staffForm.hospitalName !== activeHospitalName) {
      setStaffForm((prev) => ({ ...prev, hospitalName: activeHospitalName }));
    }
  }, [activeHospitalName, staffForm.hospitalName]);

  const fetchAppointments = async () => {
    try {
      const response = await appointmentAPI.getDepartmentAppointments(
        selectedDept,
        selectedDate,
        { hospitalName: activeHospitalName }
      );
      setAppointments(response.data.data);
    } catch (err) {
      console.log('Error fetching appointments');
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await queueAPI.getQueueByDepartment(selectedDept, {
        hospitalName: activeHospitalName,
      });
      setQueue(response.data.data);
    } catch (err) {
      console.log('Error fetching queue');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await queueAPI.getQueueStats();
      setStats(response.data.data);
    } catch (err) {
      console.log('Error fetching stats');
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      await appointmentAPI.createAppointment({
        ...appointmentForm,
        hospital: {
          name: activeHospitalName,
        },
      });
      setShowBookAppointment(false);
      setAppointmentForm({
        patientId: '',
        department: 'General',
        appointmentDate: '',
        timeSlot: '',
        reason: '',
      });
      fetchAppointments();
      alert('Appointment booked successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error booking appointment');
    }
  };

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setAppointmentForm((prev) => ({ ...prev, appointmentDate: date }));
    if (date) {
      try {
        const response = await appointmentAPI.getAvailableSlots(
          appointmentForm.department,
          date,
          { hospitalName: activeHospitalName }
        );
        setAvailableSlots(response.data.data);
      } catch (err) {
        console.log('Error fetching slots');
      }
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentAPI.cancelAppointment(appointmentId);
        fetchAppointments();
        alert('Appointment cancelled');
      } catch (err) {
        alert('Error cancelling appointment');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeptChange = (e) => {
    setSelectedDept(e.target.value);
    setAppointmentForm((prev) => ({
      ...prev,
      department: e.target.value,
    }));
  };

  const handleStaffFormChange = (e) => {
    const { name, value } = e.target;
    setStaffForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStaffImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file);
      setStaffForm((prev) => ({ ...prev, image: imageDataUrl }));
    } catch (error) {
      alert(error.message || 'Unable to use this image file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddHospitalStaff = (e) => {
    e.preventDefault();

    const hospitalName = activeHospitalName;
    const name = staffForm.name.trim();
    const phone = staffForm.phone.trim();
    const role = staffForm.role;

    if (!hospitalName || !name || !phone) {
      alert('Please fill name and phone fields.');
      return;
    }

    if (role === 'doctor') {
      const experienceYears = Number(staffForm.experienceYears);
      if (!Number.isFinite(experienceYears) || experienceYears < 0) {
        alert('Please provide a valid doctor experience in years.');
        return;
      }
    }

    try {
      addHospitalStaffEntry({
        hospitalName,
        role,
        name,
        department: staffForm.department,
        experienceYears: role === 'doctor' ? Number(staffForm.experienceYears) : 0,
        shift: role === 'reception' ? staffForm.shift : '',
        phone,
        image: staffForm.image.trim(),
      });

      refreshHospitalStaffData();
      setStaffForm((prev) => ({
        ...prev,
        hospitalName,
        name: '',
        experienceYears: '',
        shift: 'Morning Shift',
        phone: '',
        image: '',
      }));
      alert(`${role === 'doctor' ? 'Doctor' : 'Reception staff'} added successfully.`);
    } catch (error) {
      alert(error.message || 'Unable to add staff member.');
    }
  };

  const handleRemoveHospitalStaff = (staffId) => {
    if (!window.confirm('Remove this staff member from the hospital directory?')) {
      return;
    }

    removeHospitalStaffEntry(staffId);
    refreshHospitalStaffData();
  };

  return (
    <div className="dashboard-container reception-dashboard">
      <AnimatedBackground />
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Reception Dashboard</h1>
          <div className="user-info">
            <span>{user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Statistics */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.totalWaiting}</h3>
              <p>Waiting</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalInProgress}</h3>
              <p>In Service</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalCompleted}</h3>
              <p>Completed</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="controls">
          <div className="control-group">
            <label>Department:</label>
            <select value={selectedDept} onChange={handleDeptChange}>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label>Hospital:</label>
            <input type="text" value={activeHospitalName} readOnly />
          </div>

          <button onClick={() => setShowBookAppointment(true)} className="btn btn-primary">
            Book Appointment
          </button>
        </div>

        <div className="main-grid">
          {/* Appointments */}
          <div className="card">
            <h2>
              Appointments - {selectedDate} ({selectedDept}
              {activeHospitalName ? ` • ${activeHospitalName}` : ''})
            </h2>
            {appointments.length > 0 ? (
              <div className="appointments-list">
                {appointments.map((apt) => (
                  <div key={apt._id} className="appointment-card">
                    <div className="apt-header">
                      <h4>{apt.patientId?.name}</h4>
                      <span className={`status-badge ${apt.status}`}>
                        {apt.status.toUpperCase()}
                      </span>
                    </div>
                    <p>
                      <strong>Time:</strong> {apt.timeSlot}
                    </p>
                    <p>
                      <strong>Reason:</strong> {apt.reason}
                    </p>
                    {apt.doctor?.name && (
                      <p>
                        <strong>Doctor:</strong> {apt.doctor.name}
                      </p>
                    )}
                    {apt.hospital?.name && (
                      <p>
                        <strong>Hospital:</strong> {apt.hospital.name}
                      </p>
                    )}
                    <p>
                      <strong>Phone:</strong> {apt.patientId?.phone}
                    </p>
                    <button
                      onClick={() => handleCancelAppointment(apt._id)}
                      className="btn-small btn-cancel-apt"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No appointments scheduled for this date</p>
            )}
          </div>

          {/* Current Queue */}
          <div className="card">
            <h2>
              Current Queue - {selectedDept}
              {activeHospitalName ? ` • ${activeHospitalName}` : ''}
            </h2>
            {queue.length > 0 ? (
              <div className="queue-list">
                {queue.map((item) => (
                  <div key={item._id} className="queue-card">
                    <div className="queue-position">{item.queuePosition}</div>
                    <div className="queue-info">
                      <h4>{item.patientName}</h4>
                      <p>Phone: {item.patientId?.phone}</p>
                      {item.doctor?.name && <p>Doctor: {item.doctor.name}</p>}
                      {item.hospital?.name && <p>Hospital: {item.hospital.name}</p>}
                      <p>Status: {item.status.toUpperCase()}</p>
                      <p>Priority: <strong>{item.priority.toUpperCase()}</strong></p>
                      <p>Est. Wait: {item.estimatedWaitTime} min</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No patients in queue</p>
            )}
          </div>
        </div>

        <div className="card hospital-staff-card">
          <h2>Hospital Staff Directory - {activeHospitalName}</h2>

          <form className="hospital-staff-form" onSubmit={handleAddHospitalStaff}>
            <div className="control-group">
              <label>Hospital</label>
              <input
                type="text"
                name="hospitalName"
                value={staffForm.hospitalName}
                readOnly
              />
            </div>

            <div className="control-group">
              <label>Staff Type</label>
              <select name="role" value={staffForm.role} onChange={handleStaffFormChange}>
                <option value="doctor">Doctor</option>
                <option value="reception">Reception</option>
              </select>
            </div>

            <div className="control-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={staffForm.name}
                onChange={handleStaffFormChange}
                placeholder={staffForm.role === 'doctor' ? 'Dr. Name' : 'Receptionist Name'}
                required
              />
            </div>

            <div className="control-group">
              <label>Department</label>
              <select
                name="department"
                value={staffForm.department}
                onChange={handleStaffFormChange}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                {staffForm.role === 'reception' && <option value="Front Desk">Front Desk</option>}
                {staffForm.role === 'reception' && <option value="Emergency Desk">Emergency Desk</option>}
              </select>
            </div>

            {staffForm.role === 'doctor' ? (
              <div className="control-group">
                <label>Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  name="experienceYears"
                  value={staffForm.experienceYears}
                  onChange={handleStaffFormChange}
                  placeholder="e.g. 8"
                  required
                />
              </div>
            ) : (
              <div className="control-group">
                <label>Shift</label>
                <select name="shift" value={staffForm.shift} onChange={handleStaffFormChange}>
                  <option value="Morning Shift">Morning Shift</option>
                  <option value="Evening Shift">Evening Shift</option>
                  <option value="Night Shift">Night Shift</option>
                </select>
              </div>
            )}

            <div className="control-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={staffForm.phone}
                onChange={handleStaffFormChange}
                placeholder="+91-XXXXXXXXXX"
                required
              />
            </div>

            <div className="control-group">
              <label>Image URL (optional)</label>
              <input
                type="text"
                name="image"
                value={staffForm.image}
                onChange={handleStaffFormChange}
                placeholder="https://example.com/staff-photo.jpg"
              />
            </div>

            <div className="control-group">
              <label>Upload Image (optional)</label>
              <input type="file" accept="image/*" onChange={handleStaffImageUpload} />
              {staffForm.image && (
                <div className="staff-image-preview">
                  <img src={staffForm.image} alt="Staff preview" />
                  <button
                    type="button"
                    className="staff-image-clear-btn"
                    onClick={() => setStaffForm((prev) => ({ ...prev, image: '' }))}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="staff-form-actions">
              <button type="submit" className="btn btn-primary">
                Add Staff
              </button>
            </div>
          </form>

          {filteredHospitalStaff.length > 0 ? (
            <div className="staff-directory-grid">
              {filteredHospitalStaff.map((entry) => (
                <div key={entry.id} className="staff-directory-card">
                  <div className="staff-directory-avatar">
                    <img src={entry.image} alt={entry.name} className="staff-directory-avatar-image" />
                  </div>
                  <div className="staff-directory-info">
                    <h4>{entry.name}</h4>
                    <p className="staff-directory-role">
                      {entry.role === 'doctor' ? '👨‍⚕️ Doctor' : '🧑‍💼 Reception'}
                    </p>
                    <p>{entry.hospitalName}</p>
                    <p>{entry.department}</p>
                    {entry.role === 'doctor' ? (
                      <p>{entry.experienceYears} years experience</p>
                    ) : (
                      <p>{entry.shift}</p>
                    )}
                    <p>{entry.phone}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-small btn-cancel-apt"
                    onClick={() => handleRemoveHospitalStaff(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No staff data available for the selected hospital.</p>
          )}
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showBookAppointment && (
        <div className="modal">
          <div className="modal-content">
            <h3>Book Appointment</h3>
            <form onSubmit={handleBookAppointment}>
              <input
                type="text"
                placeholder="Patient ID (paste patient ID here)"
                value={appointmentForm.patientId}
                onChange={(e) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    patientId: e.target.value,
                  }))
                }
                required
              />

              <select
                value={appointmentForm.department}
                onChange={(e) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={appointmentForm.appointmentDate}
                onChange={handleDateChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />

              <select
                value={appointmentForm.timeSlot}
                onChange={(e) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    timeSlot: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select Time Slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Reason for visit"
                value={appointmentForm.reason}
                onChange={(e) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                required
              />

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  Book Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookAppointment(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
