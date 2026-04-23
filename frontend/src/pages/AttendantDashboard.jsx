import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { queueAPI, appointmentAPI } from '../utils/api';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import './AttendantDashboard_Enhanced.css';

export default function AttendantDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [selectedDept, setSelectedDept] = useState('General');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const userRole = user?.role || '';
  const isCareStaff = userRole === 'attendant' || userRole === 'doctor';
  const userHospitalName = String(user?.hospitalName || '').trim();

  const departments = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'];
  const activeHospitalName = userHospitalName;

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await queueAPI.getQueueByDepartment(selectedDept, {
        hospitalName: activeHospitalName,
      });
      setQueue(response.data.data);
    } catch (err) {
      console.log('Error fetching queue');
    } finally {
      setLoading(false);
    }
  }, [selectedDept, activeHospitalName]);

  const fetchAppointments = useCallback(async () => {
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
  }, [selectedDept, selectedDate, activeHospitalName]);

  const fetchStats = async () => {
    try {
      const response = await queueAPI.getQueueStats();
      setStats(response.data.data);
    } catch (err) {
      console.log('Error fetching stats');
    }
  };

  useEffect(() => {
    if (!isCareStaff) {
      navigate('/');
      return;
    }
    if (userRole === 'attendant' && !userHospitalName) {
      alert('Your account is missing hospital assignment. Please register again.');
      navigate('/auth');
      return;
    }
    const interval = setInterval(() => {
      fetchQueue();
      fetchAppointments();
      fetchStats();
    }, 3000); // Refresh every 3 seconds

    fetchQueue();
    fetchAppointments();
    fetchStats();

    return () => clearInterval(interval);
  }, [isCareStaff, fetchQueue, fetchAppointments, navigate, userHospitalName, userRole]);

  const handleStatusChange = async (queueId, newStatus) => {
    try {
      await queueAPI.updateQueueStatus(queueId, newStatus);
      fetchQueue();
      fetchStats();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handlePriorityChange = async (queueId, newPriority) => {
    try {
      await queueAPI.updatePriority(queueId, newPriority);
      fetchQueue();
    } catch (err) {
      alert('Error updating priority');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container attendant-dashboard">
      <AnimatedBackground />
      <nav className="navbar">
        <div className="navbar-content">
          <h1>{userRole === 'doctor' ? 'Doctor Dashboard' : 'Attendant Dashboard'}</h1>
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
              <p>In Progress</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalCompleted}</h3>
              <p>Completed Today</p>
            </div>
          </div>
        )}

        {/* Department Selection */}
        <div className="controls">
          <label>Select Department:</label>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <label>Hospital:</label>
          <input type="text" value={activeHospitalName || 'All Hospitals'} readOnly />
        </div>

        <div className="card">
          <h2>
            Appointments - {selectedDate} ({selectedDept}
            {activeHospitalName ? ` • ${activeHospitalName}` : ''})
          </h2>
          {appointments.length > 0 ? (
            <div className="queue-table-container">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Hospital</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id} className={`row-${appointment.status}`}>
                      <td>{appointment.timeSlot}</td>
                      <td>{appointment.patientId?.name || 'N/A'}</td>
                      <td>{appointment.doctor?.name || '-'}</td>
                      <td>{appointment.hospital?.name || '-'}</td>
                      <td>
                        <span className={`status-badge ${appointment.status}`}>
                          {appointment.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{appointment.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-queue">No appointments scheduled for the selected filters.</p>
          )}
        </div>

        {/* Queue Table */}
        <div className="card">
          <h2>
            {selectedDept} Department Queue
            {activeHospitalName ? ` • ${activeHospitalName}` : ''}
          </h2>
          {loading ? (
            <p>Loading queue...</p>
          ) : queue.length > 0 ? (
            <div className="queue-table-container">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Patient Name</th>
                    <th>Doctor</th>
                    <th>Hospital</th>
                    <th>Phone</th>
                    <th>Priority</th>
                    <th>Est. Wait Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item._id} className={`row-${item.status}`}>
                      <td className="position-badge">{item.queuePosition}</td>
                      <td>{item.patientName}</td>
                      <td>{item.doctor?.name || '-'}</td>
                      <td>{item.hospital?.name || '-'}</td>
                      <td>{item.patientId?.phone || 'N/A'}</td>
                      <td>
                        <select
                          value={item.priority}
                          onChange={(e) =>
                            handlePriorityChange(item._id, e.target.value)
                          }
                          className="priority-select"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </td>
                      <td>{item.estimatedWaitTime} min</td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {item.status === 'waiting' && (
                            <button
                              onClick={() =>
                                handleStatusChange(item._id, 'in-progress')
                              }
                              className="btn-small btn-start"
                            >
                              Start
                            </button>
                          )}
                          {item.status === 'in-progress' && (
                            <button
                              onClick={() =>
                                handleStatusChange(item._id, 'completed')
                              }
                              className="btn-small btn-complete"
                            >
                              Done
                            </button>
                          )}
                          {item.status !== 'completed' && (
                            <button
                              onClick={() =>
                                handleStatusChange(item._id, 'cancelled')
                              }
                              className="btn-small btn-cancel"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-queue">No patients in queue for {selectedDept}</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
