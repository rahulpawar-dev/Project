import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { readImageFileAsDataUrl } from '../utils/imageUpload';
import {
  addHospitalStaffEntry,
  getHospitalStaffEntries,
  normalizeHospitalName,
  removeHospitalStaffEntry,
} from '../utils/hospitalDirectory';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import './AdminDashboard.css';

const DEPARTMENTS = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'];

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const adminHospitalName = String(user?.hospitalName || '').trim();

  const [hospitalStaff, setHospitalStaff] = useState([]);
  const [staffForm, setStaffForm] = useState({
    hospitalName: adminHospitalName,
    role: 'doctor',
    name: '',
    department: 'General',
    experienceYears: '',
    shift: 'Morning Shift',
    phone: '',
    image: '',
  });

  const refreshHospitalStaffData = useCallback(() => {
    setHospitalStaff(getHospitalStaffEntries());
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    if (!adminHospitalName) {
      alert('Your admin account is missing hospital assignment. Please register again.');
      navigate('/auth');
      return;
    }
    refreshHospitalStaffData();
  }, [user, adminHospitalName, navigate, refreshHospitalStaffData]);

  useEffect(() => {
    if (adminHospitalName && staffForm.hospitalName !== adminHospitalName) {
      setStaffForm((prev) => ({ ...prev, hospitalName: adminHospitalName }));
    }
  }, [adminHospitalName, staffForm.hospitalName]);

  const filteredHospitalStaff = useMemo(() => {
    if (!adminHospitalName) {
      return [];
    }

    const target = normalizeHospitalName(adminHospitalName);
    return hospitalStaff.filter(
      (entry) => normalizeHospitalName(entry.hospitalName) === target
    );
  }, [hospitalStaff, adminHospitalName]);

  const dashboardStats = useMemo(() => {
    const doctorCount = filteredHospitalStaff.filter((entry) => entry.role === 'doctor').length;
    const receptionCount = filteredHospitalStaff.filter((entry) => entry.role === 'reception').length;

    return {
      doctorCount,
      receptionCount,
    };
  }, [filteredHospitalStaff]);

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

    const hospitalName = adminHospitalName;
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
        hospitalName: adminHospitalName,
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container admin-dashboard">
      <AnimatedBackground />
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>{user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">

        <div className="stats-grid">
          <div className="stat-card">
            <h3>{adminHospitalName || '-'}</h3>
            <p>Assigned Hospital</p>
          </div>
          <div className="stat-card">
            <h3>{dashboardStats.doctorCount}</h3>
            <p>Doctors</p>
          </div>
          <div className="stat-card">
            <h3>{dashboardStats.receptionCount}</h3>
            <p>Reception Staff</p>
          </div>
        </div>

        <div className="card">
          <div className="filter-bar">
            <label>Hospital</label>
            <input type="text" value={adminHospitalName} readOnly />
          </div>

          <h2>Add Hospital Staff</h2>
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
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                {staffForm.role === 'reception' && <option value="Front Desk">Front Desk</option>}
                {staffForm.role === 'reception' && (
                  <option value="Emergency Desk">Emergency Desk</option>
                )}
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

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Add Staff
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Staff Directory - {adminHospitalName}</h2>

          {filteredHospitalStaff.length > 0 ? (
            <div className="staff-grid">
              {filteredHospitalStaff.map((entry) => (
                <div key={entry.id} className="staff-card">
                  <div className="staff-avatar">
                    <img src={entry.image} alt={entry.name} />
                  </div>
                  <div className="staff-details">
                    <h4>{entry.name}</h4>
                    <p className="staff-role">
                      {entry.role === 'doctor' ? 'Doctor' : 'Reception'}
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
                    className="btn-small btn-remove"
                    onClick={() => handleRemoveHospitalStaff(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No staff data available for your hospital.</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
