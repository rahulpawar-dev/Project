import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { authAPI } from '../utils/api';
import { getHospitalNameSuggestions } from '../utils/hospitalDirectory';
import { normalizeRole, normalizeUserRole } from '../utils/roles';
import './Auth.css';

const DASHBOARD_PATHS = {
  patient: '/patient-dashboard',
  attendant: '/attendant-dashboard',
  doctor: '/doctor-dashboard',
  reception: '/reception-dashboard',
  admin: '/admin-dashboard',
  'super-admin': '/super-admin-dashboard',
};

const HOSPITAL_REQUIRED_ROLES = ['attendant', 'reception', 'admin'];

const getDashboardPath = (role) => DASHBOARD_PATHS[normalizeRole(role)] || '/patient-dashboard';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    phone: '',
    department: 'General',
    hospitalName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableHospitals, setAvailableHospitals] = useState([]);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleCredential = useCallback(
    async (googleResponse) => {
      const credential = googleResponse?.credential;

      if (!credential) {
        setError('Google login failed. Please try again.');
        return;
      }

      setError('');
      setLoading(true);

      try {
        const response = await authAPI.googleLogin(credential);
        const normalizedUser = normalizeUserRole(response.data.user);
        login(normalizedUser, response.data.token);
        navigate(getDashboardPath(normalizedUser?.role));
      } catch (err) {
        setError(err.response?.data?.message || 'Google login failed');
      } finally {
        setLoading(false);
      }
    },
    [login, navigate]
  );

  useEffect(() => {
    setAvailableHospitals(getHospitalNameSuggestions());
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      const buttonWidth = Math.min(360, googleButtonRef.current.clientWidth || 360);

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: buttonWidth,
        text: isLogin ? 'signin_with' : 'signup_with',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return undefined;
    }

    let script = document.getElementById('google-identity-service');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-identity-service';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', renderGoogleButton);

    return () => {
      script.removeEventListener('load', renderGoogleButton);
    };
  }, [googleClientId, handleGoogleCredential, isLogin]);

  const requiresHospitalRegistration = HOSPITAL_REQUIRED_ROLES.includes(formData.role);
  const hasHospitalOptions = availableHospitals.length > 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'role') {
        const nextRequiresHospital = HOSPITAL_REQUIRED_ROLES.includes(value);
        return {
          ...prev,
          role: value,
          hospitalName: nextRequiresHospital ? prev.hospitalName : '',
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login(formData.email, formData.password, {
          hospitalName: formData.hospitalName?.trim() || '',
        });
        const normalizedUser = normalizeUserRole(response.data.user);
        login(normalizedUser, response.data.token);
        navigate(getDashboardPath(normalizedUser?.role));
      } else {
        const response = await authAPI.register(formData);
        const normalizedUser = normalizeUserRole(response.data.user);
        login(normalizedUser, response.data.token);
        navigate(getDashboardPath(normalizedUser?.role));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>MediQueue</h1>
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <p className="auth-subtitle">
          {isLogin
            ? 'Sign in to access your dashboard and queue updates.'
            : 'Create your account to start booking and tracking care.'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required={!isLogin}
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required={!isLogin}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="attendant">Attendant</option>
                <option value="reception">Reception</option>
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </select>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="General">General</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Pediatrics">Pediatrics</option>
              </select>
              {requiresHospitalRegistration && (
                hasHospitalOptions ? (
                  <select
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    required={!isLogin && requiresHospitalRegistration}
                  >
                    <option value="">Select Hospital</option>
                    {availableHospitals.map((hospitalName) => (
                      <option key={hospitalName} value={hospitalName}>
                        {hospitalName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="hospitalName"
                    placeholder="Hospital Name"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    required={!isLogin && requiresHospitalRegistration}
                  />
                )
              )}
            </>
          )}

          {isLogin && (
            hasHospitalOptions ? (
              <select
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
              >
                <option value="">Select Hospital (for Admin/Attendant/Reception)</option>
                {availableHospitals.map((hospitalName) => (
                  <option key={hospitalName} value={hospitalName}>
                    {hospitalName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="hospitalName"
                placeholder="Hospital Name (for Admin/Attendant/Reception login)"
                value={formData.hospitalName}
                onChange={handleChange}
              />
            )
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="google-auth-section">
            {googleClientId ? (
              <>
                <div ref={googleButtonRef} className="google-button-slot" />
                <p className="google-auth-note">
                  {isLogin
                    ? 'Use Google for faster sign in.'
                    : 'Google sign up creates a patient account.'}
                </p>
              </>
            ) : (
              <p className="google-auth-note">
                Google login is currently unavailable. Set VITE_GOOGLE_CLIENT_ID in frontend .env.
              </p>
            )}
          </div>
        </form>

        <p className="auth-switch-text">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
