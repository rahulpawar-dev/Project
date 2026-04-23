import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password, options = {}) => api.post('/auth/login', { email, password, ...options }),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Queue API
export const queueAPI = {
  joinQueue: (department, options = {}) =>
    api.post('/queue/join', { department, ...options }),
  getQueueByDepartment: (department, options = {}) => {
    const params = new URLSearchParams();
    if (options.hospitalName) {
      params.append('hospitalName', options.hospitalName);
    }
    if (options.doctorId) {
      params.append('doctorId', options.doctorId);
    }
    if (options.doctorName) {
      params.append('doctorName', options.doctorName);
    }

    const query = params.toString();
    const endpoint = `/queue/department/${department}${query ? `?${query}` : ''}`;
    return api.get(endpoint);
  },
  getPatientQueueStatus: (patientId) =>
    api.get(`/queue/patient/${patientId}`),
  updateQueueStatus: (queueId, status) =>
    api.put(`/queue/${queueId}/status`, { status }),
  updatePriority: (queueId, priority) =>
    api.put(`/queue/${queueId}/priority`, { priority }),
  leaveQueue: (queueId) => api.delete(`/queue/${queueId}`),
  getQueueStats: () => api.get('/queue/stats/dashboard'),
  getHospitalDoctorWaitTimes: (options = {}) => {
    const params = new URLSearchParams();
    if (Array.isArray(options.hospitalNames)) {
      options.hospitalNames
        .map((name) => String(name || '').trim())
        .filter(Boolean)
        .forEach((name) => params.append('hospitalNames', name));
    }

    const query = params.toString();
    return api.get(`/queue/wait-times/hospitals${query ? `?${query}` : ''}`);
  },
};

// Appointment API
export const appointmentAPI = {
  createAppointment: (data) => api.post('/appointments', data),
  getPatientAppointments: (patientId) =>
    api.get(`/appointments/patient/${patientId}`),
  getDepartmentAppointments: (department, date, options = {}) => {
    const params = new URLSearchParams();
    if (date) {
      params.append('date', date);
    }
    if (options.hospitalName) {
      params.append('hospitalName', options.hospitalName);
    }
    if (options.doctorId) {
      params.append('doctorId', options.doctorId);
    }
    if (options.doctorName) {
      params.append('doctorName', options.doctorName);
    }

    const query = params.toString();
    return api.get(`/appointments/department/${department}${query ? `?${query}` : ''}`);
  },
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  cancelAppointment: (id) => api.delete(`/appointments/${id}`),
  getAvailableSlots: (department, date, options = {}) => {
    const params = new URLSearchParams();
    if (options.doctorId) {
      params.append('doctorId', options.doctorId);
    }
    if (options.doctorName) {
      params.append('doctorName', options.doctorName);
    }
    if (options.hospitalName) {
      params.append('hospitalName', options.hospitalName);
    }

    const query = params.toString();
    const endpoint = `/appointments/slots/${department}/${date}${query ? `?${query}` : ''}`;
    return api.get(endpoint);
  },
};

export default api;
