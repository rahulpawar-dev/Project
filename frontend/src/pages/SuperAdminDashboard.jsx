import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import {
  addHospitalCatalogEntry,
  getHospitalCatalog,
  getHospitalStaffEntries,
  normalizeHospitalName,
  removeHospitalCatalogEntry,
} from '../utils/hospitalDirectory';
import { normalizeRole } from '../utils/roles';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import './AdminDashboard.css';
import './SuperAdminDashboard.css';

const INITIAL_HOSPITAL_FORM = {
  name: '',
  address: '',
  phone: '',
  latitude: '',
  longitude: '',
  departments: 'General',
  currentWaitTime: '15 min',
  rating: '4.2',
  emergency: 'no',
};

export default function SuperAdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [hospitalCatalog, setHospitalCatalog] = useState([]);
  const [staffEntries, setStaffEntries] = useState([]);
  const [hospitalForm, setHospitalForm] = useState(INITIAL_HOSPITAL_FORM);

  const refreshCatalogData = useCallback(() => {
    setHospitalCatalog(getHospitalCatalog());
    setStaffEntries(getHospitalStaffEntries());
  }, []);

  useEffect(() => {
    if (!user || normalizeRole(user.role) !== 'super-admin') {
      navigate('/');
      return;
    }

    refreshCatalogData();
  }, [user, navigate, refreshCatalogData]);

  const staffCountByHospital = useMemo(() => {
    return staffEntries.reduce((counts, entry) => {
      const key = normalizeHospitalName(entry.hospitalName);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [staffEntries]);

  const dashboardStats = useMemo(() => {
    const totalHospitals = hospitalCatalog.length;
    const emergencyHospitals = hospitalCatalog.filter((hospital) => hospital.emergency).length;
    const averageRating = totalHospitals
      ? (hospitalCatalog.reduce((sum, hospital) => sum + (Number(hospital.rating) || 0), 0) / totalHospitals).toFixed(1)
      : '0.0';

    return {
      totalHospitals,
      emergencyHospitals,
      totalStaff: staffEntries.length,
      averageRating,
    };
  }, [hospitalCatalog, staffEntries]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setHospitalForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddHospital = (e) => {
    e.preventDefault();

    const name = hospitalForm.name.trim();
    const address = hospitalForm.address.trim();
    const phone = hospitalForm.phone.trim();
    const latitudeRaw = String(hospitalForm.latitude || '').trim();
    const longitudeRaw = String(hospitalForm.longitude || '').trim();
    const latitude = Number(latitudeRaw);
    const longitude = Number(longitudeRaw);

    if (!name || !address || !phone) {
      alert('Please provide hospital name, address, and phone.');
      return;
    }

    if (!latitudeRaw || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      alert('Latitude must be a valid number between -90 and 90.');
      return;
    }

    if (!longitudeRaw || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      alert('Longitude must be a valid number between -180 and 180.');
      return;
    }

    const parsedRating = Number(hospitalForm.rating);
    if (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      alert('Rating must be between 0 and 5.');
      return;
    }

    try {
      addHospitalCatalogEntry({
        name,
        address,
        phone,
        location: {
          lat: latitude,
          lng: longitude,
        },
        departments: hospitalForm.departments,
        currentWaitTime: hospitalForm.currentWaitTime.trim() || '15 min',
        rating: parsedRating,
        emergency: hospitalForm.emergency === 'yes',
      });

      refreshCatalogData();
      setHospitalForm(INITIAL_HOSPITAL_FORM);
      alert('Hospital added successfully.');
    } catch (error) {
      alert(error.message || 'Unable to add hospital.');
    }
  };

  const handleDeleteHospital = (hospitalId, hospitalName) => {
    const confirmed = window.confirm(
      `Delete "${hospitalName}" from hospital catalog? Linked staff records for this hospital will also be removed.`
    );

    if (!confirmed) {
      return;
    }

    try {
      removeHospitalCatalogEntry(hospitalId);
      refreshCatalogData();
      alert('Hospital deleted successfully.');
    } catch (error) {
      alert(error.message || 'Unable to delete hospital.');
    }
  };

  return (
    <div className="dashboard-container admin-dashboard super-admin-dashboard">
      <AnimatedBackground />
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Super Admin Dashboard</h1>
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
            <h3>{dashboardStats.totalHospitals}</h3>
            <p>Hospitals</p>
          </div>
          <div className="stat-card">
            <h3>{dashboardStats.emergencyHospitals}</h3>
            <p>Emergency Enabled</p>
          </div>
          <div className="stat-card">
            <h3>{dashboardStats.totalStaff}</h3>
            <p>Linked Staff Records</p>
          </div>
          <div className="stat-card">
            <h3>{dashboardStats.averageRating}</h3>
            <p>Average Rating</p>
          </div>
        </div>

        <div className="card">
          <h2>Add Hospital</h2>
          <form className="hospital-catalog-form" onSubmit={handleAddHospital}>
            <div className="control-group">
              <label>Hospital Name</label>
              <input
                type="text"
                name="name"
                value={hospitalForm.name}
                onChange={handleFormChange}
                placeholder="Hospital name"
                required
              />
            </div>

            <div className="control-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={hospitalForm.address}
                onChange={handleFormChange}
                placeholder="Hospital address"
                required
              />
            </div>

            <div className="control-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={hospitalForm.phone}
                onChange={handleFormChange}
                placeholder="+91-XXXXXXXXXX"
                required
              />
            </div>

            <div className="control-group">
              <label>Latitude</label>
              <input
                type="number"
                min="-90"
                max="90"
                step="0.000001"
                name="latitude"
                value={hospitalForm.latitude}
                onChange={handleFormChange}
                placeholder="e.g. 18.520400"
                required
              />
            </div>

            <div className="control-group">
              <label>Longitude</label>
              <input
                type="number"
                min="-180"
                max="180"
                step="0.000001"
                name="longitude"
                value={hospitalForm.longitude}
                onChange={handleFormChange}
                placeholder="e.g. 73.856700"
                required
              />
            </div>

            <div className="control-group">
              <label>Departments (comma separated)</label>
              <input
                type="text"
                name="departments"
                value={hospitalForm.departments}
                onChange={handleFormChange}
                placeholder="General, Cardiology"
              />
            </div>

            <div className="control-group">
              <label>Current Wait Time</label>
              <input
                type="text"
                name="currentWaitTime"
                value={hospitalForm.currentWaitTime}
                onChange={handleFormChange}
                placeholder="e.g. 18 min"
              />
            </div>

            <div className="control-group">
              <label>Rating</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                name="rating"
                value={hospitalForm.rating}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="control-group">
              <label>Emergency Service</label>
              <select name="emergency" value={hospitalForm.emergency} onChange={handleFormChange}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Add Hospital
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Hospital Directory</h2>
          {hospitalCatalog.length > 0 ? (
            <div className="hospital-grid">
              {hospitalCatalog.map((hospital) => {
                const normalizedName = normalizeHospitalName(hospital.name);
                const linkedStaffCount = staffCountByHospital[normalizedName] || 0;

                return (
                  <article key={hospital.id} className="hospital-card">
                    <div className="hospital-card-head">
                      <h4>{hospital.name}</h4>
                      <span className={`hospital-badge ${hospital.emergency ? 'is-emergency' : 'is-standard'}`}>
                        {hospital.emergency ? 'Emergency' : 'Standard'}
                      </span>
                    </div>
                    <p>{hospital.address}</p>
                    <p>{hospital.phone}</p>
                    {hospital.location && (
                      <p>
                        📍 Lat: {Number(hospital.location.lat).toFixed(6)}, Lng:{' '}
                        {Number(hospital.location.lng).toFixed(6)}
                      </p>
                    )}
                    <p>{hospital.departments.join(', ')}</p>
                    <div className="hospital-meta">
                      <span>Wait: {hospital.currentWaitTime}</span>
                      <span>Rating: {Number(hospital.rating).toFixed(1)}</span>
                      <span>Staff: {linkedStaffCount}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-small btn-remove"
                      onClick={() => handleDeleteHospital(hospital.id, hospital.name)}
                    >
                      Delete Hospital
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="no-data">No hospitals in catalog. Add your first hospital above.</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
