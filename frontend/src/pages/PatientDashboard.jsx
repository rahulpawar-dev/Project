import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { queueAPI, appointmentAPI } from '../utils/api';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import Exercise3DCard from '../components/Exercise3DCard';
import HealthTips3D from '../components/HealthTips3D';
import FitnessGoals3D from '../components/FitnessGoals3D';
import {
  DEFAULT_DEMO_LOCATION,
  getDemoHospitalsForLocation,
  normalizeHospitalName,
} from '../utils/hospitalDirectory';
import './PatientDashboard_Enhanced.css';

const NEARBY_RADIUS_METERS = 10000;
const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000;
const LOCATION_REFRESH_MS = 30000;
const DEPARTMENTS = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'];
const FALLBACK_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
const EMPTY_HOSPITAL = { name: '', address: '', phone: '' };
const EMPTY_DOCTOR = {
  id: '',
  name: '',
  department: '',
  experience: '',
  phone: '',
  image: '',
};
const CONSULTATION_FEES = {
  General: 499,
  Cardiology: 899,
  Neurology: 999,
  Orthopedics: 799,
  Pediatrics: 699,
};

const getConsultationFee = (department = 'General') =>
  CONSULTATION_FEES[department] || CONSULTATION_FEES.General;

const buildInitialPaymentState = (department = 'General') => ({
  method: 'upi',
  amount: getConsultationFee(department),
  currency: 'INR',
  status: 'pending',
  transactionId: '',
  paidAt: '',
  payerReference: '',
  upiId: '',
  cardNumber: '',
  cardHolder: '',
  expiry: '',
  cvv: '',
});

const normalizeTextValue = (value = '') =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getDoctorQueueMatchKey = ({ doctorId = '', doctorName = '', department = '' }) => {
  const normalizedDoctorId = String(doctorId || '').trim();
  if (normalizedDoctorId) {
    return `id:${normalizedDoctorId}`;
  }

  const normalizedDoctorName = normalizeTextValue(doctorName);
  if (!normalizedDoctorName) {
    return '';
  }

  const normalizedDepartment = normalizeTextValue(department);
  return `name:${normalizedDoctorName}::dept:${normalizedDepartment}`;
};

const formatWaitTimeMinutes = (minutes) => `${Math.max(0, Math.round(Number(minutes) || 0))} min`;

const parseWaitTimeMinutes = (waitTimeLabel = '') => {
  const matched = String(waitTimeLabel || '').match(/\d+/);
  if (!matched) {
    return 0;
  }

  return Math.max(0, Number(matched[0]) || 0);
};

export default function PatientDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [queueStatus, setQueueStatus] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [showBookAppointment, setShowBookAppointment] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [mapsInfo, setMapsInfo] = useState('');
  const [mapsError, setMapsError] = useState('');
  const [lastLocationUpdated, setLastLocationUpdated] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const refreshInProgressRef = useRef(false);
  const [appointmentForm, setAppointmentForm] = useState({
    department: 'General',
    appointmentDate: '',
    timeSlot: '',
    reason: '',
    hospital: { ...EMPTY_HOSPITAL },
    doctor: { ...EMPTY_DOCTOR },
  });
  const [paymentState, setPaymentState] = useState(() => buildInitialPaymentState('General'));
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const navigate = useNavigate();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const userId = user?.id || user?._id || null;

  const getHospitalByName = (hospitalName = '') => {
    const target = normalizeHospitalName(hospitalName);
    if (!target) {
      return null;
    }

    return (
      nearbyHospitals.find((hospital) => normalizeHospitalName(hospital.name) === target) || null
    );
  };

  const getHospitalDoctorOptions = (hospital, departmentFilter = '') => {
    if (!hospital?.doctors || typeof hospital.doctors !== 'object') {
      return [];
    }

    return Object.entries(hospital.doctors).flatMap(([department, doctors]) => {
      if (departmentFilter && department !== departmentFilter) {
        return [];
      }

      if (!Array.isArray(doctors)) {
        return [];
      }

      return doctors
        .filter((doctor) => doctor?.name)
        .map((doctor, index) => ({
          id:
            String(doctor.id || '').trim()
            || `${normalizeHospitalName(hospital.name)}-${normalizeHospitalName(department)}-${index}`,
          name: doctor.name,
          department,
          experience: doctor.experience || '',
          phone: doctor.phone || '',
          image: doctor.image || '',
        }));
    });
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      department: 'General',
      appointmentDate: '',
      timeSlot: '',
      reason: '',
      hospital: { ...EMPTY_HOSPITAL },
      doctor: { ...EMPTY_DOCTOR },
    });
    setPaymentState(buildInitialPaymentState('General'));
    setAvailableSlots([]);
  };

  const loadAvailableSlots = async ({ department, date, doctor, hospital }) => {
    if (!date) {
      setAvailableSlots([]);
      return;
    }

    try {
      const response = await appointmentAPI.getAvailableSlots(department, date, {
        doctorId: doctor?.id || '',
        doctorName: doctor?.name || '',
        hospitalName: hospital?.name || '',
      });

      const slots = Array.isArray(response.data.data) && response.data.data.length > 0
        ? response.data.data
        : FALLBACK_SLOTS;
      setAvailableSlots(slots);
    } catch (err) {
      setAvailableSlots(FALLBACK_SLOTS);
    }
  };

  const resetPaymentForDepartment = (department, method = 'upi') => {
    setPaymentState((prev) => ({
      ...buildInitialPaymentState(department),
      method: method || prev.method || 'upi',
    }));
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentState((prev) => ({
      ...buildInitialPaymentState(appointmentForm.department),
      method,
    }));
  };

  const handlePaymentInputChange = (field, value) => {
    setPaymentState((prev) => ({
      ...prev,
      [field]: value,
      status: 'pending',
      transactionId: '',
      paidAt: '',
      payerReference: '',
    }));
  };

  const validatePaymentDetails = () => {
    if (paymentState.method === 'upi') {
      const normalizedUpi = paymentState.upiId.trim().toLowerCase();
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(normalizedUpi)) {
        return 'Please enter a valid UPI ID.';
      }
      return '';
    }

    if (paymentState.method === 'card') {
      const cardDigits = paymentState.cardNumber.replace(/\D/g, '');
      const cvvDigits = paymentState.cvv.replace(/\D/g, '');
      if (cardDigits.length < 13 || cardDigits.length > 19) {
        return 'Please enter a valid card number.';
      }
      if (!paymentState.cardHolder.trim()) {
        return 'Please enter card holder name.';
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentState.expiry.trim())) {
        return 'Please enter card expiry in MM/YY format.';
      }
      if (!/^\d{3,4}$/.test(cvvDigits)) {
        return 'Please enter a valid CVV.';
      }
      return '';
    }

    return 'Please select a payment method.';
  };

  const handleProcessPayment = async () => {
    if (!appointmentForm.hospital.name.trim() || !appointmentForm.doctor.name.trim()) {
      alert('Please select hospital and doctor before payment.');
      return;
    }
    if (!appointmentForm.appointmentDate || !appointmentForm.timeSlot) {
      alert('Please select appointment date and time slot before payment.');
      return;
    }

    const validationMessage = validatePaymentDetails();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    setIsProcessingPayment(true);
    try {
      await new Promise((resolve) => {
        setTimeout(resolve, 900);
      });

      const transactionId = `MQPAY-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
      const paidAt = new Date().toISOString();
      const cardDigits = paymentState.cardNumber.replace(/\D/g, '');
      const payerReference = paymentState.method === 'upi'
        ? paymentState.upiId.trim().toLowerCase()
        : `CARD-XXXX-${cardDigits.slice(-4)}`;

      setPaymentState((prev) => ({
        ...prev,
        status: 'paid',
        transactionId,
        paidAt,
        payerReference,
      }));

      alert(`Payment successful. Transaction ID: ${transactionId}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const buildPaymentPayload = () => ({
    method: paymentState.method,
    amount: paymentState.amount,
    currency: paymentState.currency,
    status: paymentState.status,
    transactionId: paymentState.transactionId,
    paidAt: paymentState.paidAt,
    payerReference: paymentState.payerReference,
  });

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/');
      return;
    }
    if (userId) {
      fetchQueueStatus();
      fetchAppointments();
    }
  }, [user, userId, navigate]);

  const fetchQueueStatus = async () => {
    if (!userId) {
      setQueueStatus(null);
      return;
    }

    try {
      const response = await queueAPI.getPatientQueueStatus(userId);
      setQueueStatus(response.data.data);
    } catch (err) {
      setQueueStatus(null);
    }
  };

  const fetchAppointments = async () => {
    if (!userId) {
      setAppointments([]);
      return;
    }

    try {
      const response = await appointmentAPI.getPatientAppointments(userId);
      setAppointments(response.data.data);
    } catch (err) {
      console.log('Error fetching appointments');
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await queueAPI.leaveQueue(queueStatus._id);
      setQueueStatus(null);
      alert('Removed from queue');
    } catch (err) {
      alert('Error removing from queue');
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    if (!appointmentForm.hospital.name.trim()) {
      alert('Please select a hospital');
      return;
    }
    if (!appointmentForm.doctor.name.trim()) {
      alert('Please select a doctor');
      return;
    }
    if (!appointmentForm.appointmentDate) {
      alert('Please select an appointment date');
      return;
    }
    if (!appointmentForm.timeSlot) {
      alert('Please select a time slot');
      return;
    }
    if (!appointmentForm.reason.trim()) {
      alert('Please provide a reason for the visit');
      return;
    }
    if (paymentState.status !== 'paid' || !paymentState.transactionId) {
      alert('Please complete payment before booking the appointment.');
      return;
    }
    if (!userId) {
      alert('Unable to identify your account. Please login again.');
      return;
    }

    try {
      await appointmentAPI.createAppointment({
        patientId: userId,
        ...appointmentForm,
        reason: appointmentForm.reason.trim(),
        doctor: {
          id: appointmentForm.doctor.id,
          name: appointmentForm.doctor.name,
          department: appointmentForm.doctor.department || appointmentForm.department,
          experience: appointmentForm.doctor.experience || '',
          phone: appointmentForm.doctor.phone || '',
          image: appointmentForm.doctor.image || '',
        },
        payment: buildPaymentPayload(),
      });
      setShowBookAppointment(false);
      resetAppointmentForm();
      await fetchAppointments();
      await fetchQueueStatus();

      alert('✅ Appointment booked successfully! Your queue status has been updated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error booking appointment');
    }
  };

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setAppointmentForm((prev) => ({ ...prev, appointmentDate: date, timeSlot: '' }));
    await loadAvailableSlots({
      department: appointmentForm.department,
      date,
      doctor: appointmentForm.doctor,
      hospital: appointmentForm.hospital,
    });
  };

  const handleHospitalSelection = async (hospitalName) => {
    const selectedHospital = getHospitalByName(hospitalName);

    if (!selectedHospital) {
      setAppointmentForm((prev) => ({
        ...prev,
        department: 'General',
        hospital: { ...EMPTY_HOSPITAL },
        doctor: { ...EMPTY_DOCTOR },
        timeSlot: '',
      }));
      resetPaymentForDepartment('General', paymentState.method);
      setAvailableSlots([]);
      return;
    }

    const availableDepartments = selectedHospital.departments?.length
      ? selectedHospital.departments
      : DEPARTMENTS;
    const initialDepartment = availableDepartments.includes(appointmentForm.department)
      ? appointmentForm.department
      : availableDepartments[0] || 'General';
    const doctorsForDepartment = getHospitalDoctorOptions(selectedHospital, initialDepartment);
    const fallbackDoctor = doctorsForDepartment[0] || getHospitalDoctorOptions(selectedHospital)[0] || null;
    const nextDepartment = fallbackDoctor?.department || initialDepartment;
    const nextHospital = {
      name: selectedHospital.name || '',
      address: selectedHospital.address || '',
      phone: selectedHospital.phone || '',
    };
    const nextDoctor = fallbackDoctor ? { ...EMPTY_DOCTOR, ...fallbackDoctor } : { ...EMPTY_DOCTOR };

    setAppointmentForm((prev) => ({
      ...prev,
      department: nextDepartment,
      hospital: nextHospital,
      doctor: nextDoctor,
      timeSlot: '',
    }));
    resetPaymentForDepartment(nextDepartment, paymentState.method);

    await loadAvailableSlots({
      department: nextDepartment,
      date: appointmentForm.appointmentDate,
      doctor: nextDoctor,
      hospital: nextHospital,
    });
  };

  const handleDepartmentChange = async (department) => {
    const selectedHospital = getHospitalByName(appointmentForm.hospital.name);
    const doctorsForDepartment = selectedHospital
      ? getHospitalDoctorOptions(selectedHospital, department)
      : [];
    const nextDoctor = doctorsForDepartment[0]
      ? { ...EMPTY_DOCTOR, ...doctorsForDepartment[0] }
      : { ...EMPTY_DOCTOR };

    setAppointmentForm((prev) => ({
      ...prev,
      department,
      doctor: nextDoctor,
      timeSlot: '',
    }));
    resetPaymentForDepartment(department, paymentState.method);

    await loadAvailableSlots({
      department,
      date: appointmentForm.appointmentDate,
      doctor: nextDoctor,
      hospital: appointmentForm.hospital,
    });
  };

  const handleDoctorChange = async (doctorId) => {
    const selectedHospital = getHospitalByName(appointmentForm.hospital.name);
    if (!selectedHospital) {
      return;
    }

    const doctorsForDepartment = getHospitalDoctorOptions(
      selectedHospital,
      appointmentForm.department
    );
    const selectedDoctor = doctorsForDepartment.find((doctor) => doctor.id === doctorId);
    const nextDoctor = selectedDoctor ? { ...EMPTY_DOCTOR, ...selectedDoctor } : { ...EMPTY_DOCTOR };

    setAppointmentForm((prev) => ({
      ...prev,
      doctor: nextDoctor,
      timeSlot: '',
    }));

    await loadAvailableSlots({
      department: appointmentForm.department,
      date: appointmentForm.appointmentDate,
      doctor: nextDoctor,
      hospital: appointmentForm.hospital,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const loadGoogleMaps = () => {
    return new Promise((resolve) => {
      if (window.google?.maps) {
        setGoogleMapsReady(true);
        resolve(true);
        return;
      }

      if (!googleMapsApiKey) {
        setGoogleMapsReady(false);
        resolve(false);
        return;
      }

      const existingScript = document.querySelector('script[data-google-maps="patient-dashboard"]');
      if (existingScript) {
        let settled = false;
        const finish = (ready) => {
          if (settled) {
            return;
          }
          settled = true;
          setGoogleMapsReady(ready);
          resolve(ready);
        };

        existingScript.addEventListener(
          'load',
          () => finish(Boolean(window.google?.maps)),
          { once: true }
        );
        existingScript.addEventListener('error', () => finish(false), { once: true });

        setTimeout(() => {
          finish(Boolean(window.google?.maps));
        }, 1500);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = 'patient-dashboard';
      script.onload = () => {
        const ready = Boolean(window.google?.maps);
        setGoogleMapsReady(ready);
        resolve(ready);
      };
      script.onerror = () => {
        setGoogleMapsReady(false);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  };

  // Get user's current location
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const toRadians = (value) => (value * Math.PI) / 180;

  const calculateDistanceKm = (start, end) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(end.lat - start.lat);
    const dLng = toRadians(end.lng - start.lng);
    const lat1 = toRadians(start.lat);
    const lat2 = toRadians(end.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1) * Math.cos(lat2)
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const getNearbyHospitalsFromCatalog = (location) =>
    getDemoHospitalsForLocation(
      location,
      calculateDistanceKm,
      undefined,
      undefined,
      NEARBY_RADIUS_KM
    );

  const mapDoctorsWithQueueWait = (hospitalDoctors = {}, doctorSummaryMap = new Map()) =>
    Object.entries(hospitalDoctors || {}).reduce((nextDoctors, [department, doctors]) => {
      if (!Array.isArray(doctors)) {
        nextDoctors[department] = [];
        return nextDoctors;
      }

      nextDoctors[department] = doctors.map((doctor) => {
        const doctorKeyById = getDoctorQueueMatchKey({
          doctorId: doctor.id,
        });
        const doctorKeyByName = getDoctorQueueMatchKey({
          doctorName: doctor.name,
          department: doctor.department || department,
        });
        const doctorSummary = (doctorKeyById && doctorSummaryMap.get(doctorKeyById))
          || (doctorKeyByName && doctorSummaryMap.get(doctorKeyByName))
          || null;
        const queueLength = Number.isFinite(Number(doctorSummary?.queueLength))
          ? Number(doctorSummary.queueLength)
          : 0;
        const estimatedWaitTime = Number.isFinite(Number(doctorSummary?.estimatedWaitTime))
          ? Number(doctorSummary.estimatedWaitTime)
          : 0;

        return {
          ...doctor,
          queueLength,
          estimatedWaitTime,
        };
      });

      return nextDoctors;
    }, {});

  const applyQueueWaitTimesToHospitals = async (hospitals = []) => {
    if (!Array.isArray(hospitals) || hospitals.length === 0) {
      return [];
    }

    const hospitalNames = hospitals
      .map((hospital) => String(hospital.name || '').trim())
      .filter(Boolean);

    if (hospitalNames.length === 0) {
      return hospitals;
    }

    try {
      const response = await queueAPI.getHospitalDoctorWaitTimes({ hospitalNames });
      const waitSummaries = Array.isArray(response.data.data) ? response.data.data : [];
      const waitSummaryByHospital = new Map(
        waitSummaries.map((summary) => [
          normalizeTextValue(summary.hospitalName),
          summary,
        ])
      );

      return hospitals.map((hospital) => {
        const summary = waitSummaryByHospital.get(normalizeTextValue(hospital.name));
        const doctorSummaryMap = new Map();
        if (Array.isArray(summary?.doctors)) {
          summary.doctors.forEach((doctorSummary) => {
            const doctorKeyById = getDoctorQueueMatchKey({
              doctorId: doctorSummary.doctorId,
            });
            const doctorKeyByName = getDoctorQueueMatchKey({
              doctorName: doctorSummary.doctorName,
              department: doctorSummary.department,
            });
            if (!doctorKeyById && !doctorKeyByName) {
              return;
            }
            if (doctorKeyById) {
              doctorSummaryMap.set(doctorKeyById, doctorSummary);
            }
            if (doctorKeyByName) {
              doctorSummaryMap.set(doctorKeyByName, doctorSummary);
            }
          });
        }

        const currentQueueLength = Number.isFinite(Number(summary?.queueLength))
          ? Number(summary.queueLength)
          : 0;
        const fallbackWaitMinutes = parseWaitTimeMinutes(hospital.currentWaitTime);
        const currentWaitMinutes = Number.isFinite(Number(summary?.estimatedWaitTime))
          ? Number(summary.estimatedWaitTime)
          : fallbackWaitMinutes;

        return {
          ...hospital,
          doctors: mapDoctorsWithQueueWait(hospital.doctors, doctorSummaryMap),
          currentQueueLength,
          currentWaitMinutes,
          currentWaitTime: formatWaitTimeMinutes(currentWaitMinutes),
        };
      });
    } catch (error) {
      return hospitals.map((hospital) => {
        const currentWaitMinutes = parseWaitTimeMinutes(hospital.currentWaitTime);
        return {
          ...hospital,
          doctors: mapDoctorsWithQueueWait(hospital.doctors),
          currentQueueLength: 0,
          currentWaitMinutes,
          currentWaitTime: formatWaitTimeMinutes(currentWaitMinutes),
        };
      });
    }
  };

  const clearMapMarkers = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  };

  const renderMap = (location, hospitals) => {
    if (!window.google?.maps || !mapContainerRef.current) {
      return;
    }
    const center = { lat: location.latitude, lng: location.longitude };
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
      });
    } else {
      mapRef.current.setCenter(center);
    }

    clearMapMarkers();

    const userMarker = new window.google.maps.Marker({
      position: center,
      map: mapRef.current,
      title: 'Your Location',
    });
    markersRef.current.push(userMarker);

    hospitals.forEach((hospital) => {
      if (!hospital.location) {
        return;
      }
      const marker = new window.google.maps.Marker({
        position: hospital.location,
        map: mapRef.current,
        title: hospital.name,
      });
      markersRef.current.push(marker);
    });
  };

  const refreshNearbyHospitals = async () => {
    if (refreshInProgressRef.current) {
      return;
    }
    refreshInProgressRef.current = true;
    setLoadingHospitals(true);
    setMapsInfo('');
    setMapsError('');
    try {
      const googleAvailable = await loadGoogleMaps();
      let location;
      let infoMessage = '';
      try {
        location = await getUserLocation();
      } catch (locationError) {
        location = DEFAULT_DEMO_LOCATION;
        infoMessage = `Location access is unavailable. Showing hospitals around default location within ${NEARBY_RADIUS_KM} km.`;
      }
      setUserLocation(location);

      const hospitals = getNearbyHospitalsFromCatalog(location);
      const queueAwareHospitals = await applyQueueWaitTimesToHospitals(hospitals);

      if (!googleAvailable) {
        infoMessage = `${infoMessage}${infoMessage ? ' ' : ''}Showing map preview while nearby hospital search continues.`;
      }

      if (queueAwareHospitals.length === 0) {
        infoMessage = `${infoMessage}${infoMessage ? ' ' : ''}No hospitals found within ${NEARBY_RADIUS_KM} km.`;
      }

      if (infoMessage) {
        setMapsInfo(infoMessage);
      }

      setGoogleMapsReady(googleAvailable);
      setNearbyHospitals(queueAwareHospitals);
      setMapsLoaded(true);
      setLastLocationUpdated(new Date());
    } catch (error) {
      try {
        const hospitals = getNearbyHospitalsFromCatalog(DEFAULT_DEMO_LOCATION);
        const queueAwareHospitals = await applyQueueWaitTimesToHospitals(hospitals);
        setGoogleMapsReady(false);
        setUserLocation(DEFAULT_DEMO_LOCATION);
        setNearbyHospitals(queueAwareHospitals);
        setMapsLoaded(true);
        setLastLocationUpdated(new Date());
        setMapsInfo(
          `Unable to detect your location. Showing hospitals around default location within ${NEARBY_RADIUS_KM} km.`
        );
      } catch (demoError) {
        const message = error?.message || 'Unable to load nearby hospitals. Please try again.';
        setMapsError(message);
        setNearbyHospitals([]);
        setMapsLoaded(true);
        console.error('Nearby hospitals error:', error);
        console.error('Demo hospitals fallback error:', demoError);
      }
    } finally {
      setLoadingHospitals(false);
      refreshInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (googleMapsReady && userLocation) {
      renderMap(userLocation, nearbyHospitals);
    }
  }, [googleMapsReady, userLocation, nearbyHospitals]);

  useEffect(() => {
    let intervalId;
    let isCancelled = false;

    const startTracking = async () => {
      await refreshNearbyHospitals();
      if (isCancelled) {
        return;
      }

      intervalId = setInterval(() => {
        refreshNearbyHospitals();
      }, LOCATION_REFRESH_MS);
    };

    startTracking();

    return () => {
      isCancelled = true;
      clearMapMarkers();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Open Google Maps with directions
  const openMapDirections = (hospital) => {
    if (!userLocation) {
      alert('Unable to get your current location for directions.');
      return;
    }

    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = hospital.placeId
      ? hospital.name || hospital.address || 'Hospital'
      : hospital.location
        ? `${hospital.location.lat},${hospital.location.lng}`
        : hospital.address || hospital.name;
    const mapsUrl = hospital.placeId
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&destination_place_id=${encodeURIComponent(hospital.placeId)}`
      : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    window.open(mapsUrl, '_blank', 'noopener');
  };

  // Call hospital
  const callHospital = (hospital) => {
    if (!hospital.phone) {
      alert('Phone number not available for this hospital.');
      return;
    }
    window.location.href = `tel:${hospital.phone}`;
  };

  // Book visit at hospital
  const bookHospitalVisit = (hospital) => {
    const hospitalDepartments = hospital.departments?.length ? hospital.departments : DEPARTMENTS;
    const initialDepartment = hospitalDepartments[0] || 'General';
    const doctorsForDepartment = getHospitalDoctorOptions(hospital, initialDepartment);
    const fallbackDoctor = doctorsForDepartment[0] || getHospitalDoctorOptions(hospital)[0] || null;
    const selectedDepartment = fallbackDoctor?.department || initialDepartment;

    setAppointmentForm({
      department: selectedDepartment,
      appointmentDate: '',
      timeSlot: '',
      reason: '',
      hospital: {
        name: hospital.name || '',
        address: hospital.address || '',
        phone: hospital.phone || '',
      },
      doctor: fallbackDoctor ? { ...EMPTY_DOCTOR, ...fallbackDoctor } : { ...EMPTY_DOCTOR },
    });
    setPaymentState(buildInitialPaymentState(selectedDepartment));
    setAvailableSlots([]);
    setShowBookAppointment(true);
  };

  const openBookAppointmentModal = () => {
    if (nearbyHospitals.length > 0) {
      bookHospitalVisit(nearbyHospitals[0]);
      return;
    }

    resetAppointmentForm();
    setShowBookAppointment(true);
  };

  const selectedHospital = getHospitalByName(appointmentForm.hospital.name);
  const hospitalDepartmentOptions = Array.from(
    new Set([
      ...(selectedHospital?.departments?.length ? selectedHospital.departments : DEPARTMENTS),
      ...(selectedHospital?.doctors ? Object.keys(selectedHospital.doctors) : []),
    ])
  );
  const doctorOptions = selectedHospital
    ? getHospitalDoctorOptions(selectedHospital, appointmentForm.department)
    : [];
  const isPaymentCompleted = paymentState.status === 'paid' && Boolean(paymentState.transactionId);
  const canProcessPayment = Boolean(
    appointmentForm.hospital.name
      && appointmentForm.doctor.name
      && appointmentForm.appointmentDate
      && appointmentForm.timeSlot
  );
  const mapPreviewCenter = userLocation || DEFAULT_DEMO_LOCATION;
  const demoMapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    `${mapPreviewCenter.latitude},${mapPreviewCenter.longitude} hospitals`
  )}&z=13&output=embed`;

  return (
    <div className="dashboard-container">
      <AnimatedBackground />
      {/* Enhanced Header */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <div className="welcome-user">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h1>{user?.name}</h1>
                <p className="user-greeting">Welcome back to your health dashboard</p>
              </div>
            </div>
          </div>
          <div className="navbar-right">
            <div className="quick-stats">
              <div className="stat-item">
                <span className="stat-icon">📅</span>
                <span>{appointments.length} Appointments</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">⏱️</span>
                <span>{queueStatus ? `${queueStatus.estimatedWaitTime}min` : 'Not in queue'}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Quick Actions Bar */}
        <div className="quick-actions">
          <button
            onClick={openBookAppointmentModal}
            className="action-btn secondary"
          >
            <span className="action-icon">📅</span>
            <span>Book Appointment</span>
          </button>
          <button
            onClick={refreshNearbyHospitals}
            className="action-btn tertiary"
            disabled={loadingHospitals}
          >
            <span className="action-icon">🏥</span>
            <span>{loadingHospitals ? 'Updating...' : 'Refresh Hospitals'}</span>
          </button>
        </div>

        <div className="main-grid">
          {/* Queue Status Section */}
          <div className="card queue-card">
            <div className="card-header">
              <h2>
                <span className="card-icon">⏳</span>
                Queue Status
              </h2>
              <div className="card-status">
                {queueStatus ? (
                  <span className={`status-indicator ${queueStatus.status}`}>
                    {queueStatus.status.toUpperCase()}
                  </span>
                ) : (
                  <span className="status-indicator inactive">NOT IN QUEUE</span>
                )}
              </div>
            </div>

            {queueStatus ? (
              <div className="queue-info">
                <div className="queue-metrics">
                  <div className="metric">
                    <span className="metric-label">Position</span>
                    <span className="metric-value position-number">{queueStatus.queuePosition}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Department</span>
                    <span className="metric-value">{queueStatus.department}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Est. Wait</span>
                    <span className="metric-value">{queueStatus.estimatedWaitTime} min</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Doctor Queue</span>
                    <span className="metric-value">{queueStatus.queueLength || queueStatus.queuePosition}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Ahead of You</span>
                    <span className="metric-value">{queueStatus.peopleAhead || 0}</span>
                  </div>
                </div>
                {(queueStatus.doctor?.name || queueStatus.hospital?.name) && (
                  <p className="queue-context">
                    {queueStatus.doctor?.name ? `Doctor: ${queueStatus.doctor.name}` : ''}
                    {queueStatus.doctor?.name && queueStatus.hospital?.name ? ' • ' : ''}
                    {queueStatus.hospital?.name ? `Hospital: ${queueStatus.hospital.name}` : ''}
                  </p>
                )}
                <div className="queue-actions">
                  <button
                    onClick={handleLeaveQueue}
                    className="btn btn-danger btn-sm"
                  >
                    <span>❌</span> Leave Queue
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p>You are not in any queue</p>
                <p className="empty-subtitle">
                  Queue status will appear here after your appointment is confirmed
                </p>
              </div>
            )}
          </div>

          {/* Appointments Section */}
          <div className="card appointments-card">
            <div className="card-header">
              <h2>
                <span className="card-icon">📅</span>
                My Appointments
              </h2>
              <span className="card-count">{appointments.length}</span>
            </div>

            {appointments.length > 0 ? (
              <div className="appointments-list">
                {appointments.slice(0, 3).map((apt) => (
                  <div key={apt._id} className="appointment-item">
                    <div className="appointment-header">
                      <div className="appointment-date">
                        <span className="date-icon">📅</span>
                        {new Date(apt.appointmentDate).toLocaleDateString()}
                      </div>
                      <span className={`status-badge ${apt.status}`}>
                        {apt.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="appointment-details">
                      <p><strong>Time:</strong> {apt.timeSlot}</p>
                      <p><strong>Department:</strong> {apt.department}</p>
                      {apt.doctor?.name && (
                        <p><strong>Doctor:</strong> {apt.doctor.name}</p>
                      )}
                      {apt.hospital && apt.hospital.name && (
                        <p><strong>Hospital:</strong> {apt.hospital.name}</p>
                      )}
                      <p><strong>Reason:</strong> {apt.reason}</p>
                    </div>
                  </div>
                ))}
                {appointments.length > 3 && (
                  <div className="show-more">
                    <span>+{appointments.length - 3} more appointments</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No appointments scheduled</p>
                <p className="empty-subtitle">Book your first appointment</p>
              </div>
            )}

            <button
              onClick={openBookAppointmentModal}
              className="btn btn-primary btn-full"
            >
              <span>📅</span> Book New Appointment
            </button>
          </div>
        </div>

        <div className="hospitals-section">
          <div className="hospitals-header">
            <div>
              <h2>Nearby Hospitals</h2>
            </div>
            <div className="hospitals-actions">
              <button
                onClick={refreshNearbyHospitals}
                className="btn btn-outline"
                disabled={loadingHospitals}
              >
                {loadingHospitals ? 'Updating...' : 'Refresh'}
              </button>
              {lastLocationUpdated && (
                <span className="update-time">
                  Updated {lastLocationUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {mapsInfo && <div className="info-message">{mapsInfo}</div>}
          {mapsError && <div className="error-message">{mapsError}</div>}

          <div className="hospitals-grid">
            {googleMapsReady ? (
              <div className="hospitals-map" ref={mapContainerRef} />
            ) : (
              <div className="hospitals-map hospitals-map-demo" role="region" aria-label="Google map preview">
                <div className="demo-map-header">
                  <span className="demo-map-badge">Google Map Preview</span>
                  <span className="demo-map-meta">{nearbyHospitals.length} nearby hospitals</span>
                </div>
                <iframe
                  className="demo-map-frame"
                  title="Nearby hospitals map"
                  src={demoMapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="demo-map-footer">
                  <span>
                    Centered near: {mapPreviewCenter.latitude.toFixed(4)}, {mapPreviewCenter.longitude.toFixed(4)}
                  </span>
                  {userLocation && nearbyHospitals[0] && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openMapDirections(nearbyHospitals[0])}
                    >
                      <span>🧭</span> Route to nearest
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="hospitals-list">
              {nearbyHospitals.length > 0 ? (
                nearbyHospitals.map((hospital) => (
                  <div key={hospital.id} className="hospital-card">
                    <div className="hospital-header">
                      <div className="hospital-info">
                        <h4>{hospital.name}</h4>
                        <div className="hospital-meta">
                          <span className="distance">📍 {hospital.distance}</span>
                          <span className="rating">⭐ {hospital.rating ?? 'N/A'}</span>
                          {hospital.emergency && (
                            <span className="emergency-badge">🚑 Emergency</span>
                          )}
                        </div>
                      </div>
                      <div className="wait-time">
                        <span className="wait-label">Current Wait</span>
                        <span className="wait-value">{hospital.currentWaitTime || '0 min'}</span>
                        <span className="wait-subvalue">{hospital.currentQueueLength || 0} in queue</span>
                      </div>
                    </div>

                    <div className="hospital-details">
                      <p className="address">📍 {hospital.address}</p>
                      <p className="phone">📞 {hospital.phone || 'Not available'}</p>
                      <div className="departments">
                        <span className="dept-label">Departments:</span>
                        <div className="dept-tags">
                          {(hospital.departments?.length ? hospital.departments : ['General']).map((dept) => (
                            <span key={dept} className="dept-tag">{dept}</span>
                          ))}
                        </div>
                      </div>

                      {hospital.doctors && Object.keys(hospital.doctors).length > 0 && (
                        <div className="doctors-section">
                          <h5 className="doctors-title">👨‍⚕️ Available Doctors</h5>
                          <div className="doctors-grid">
                            {Object.entries(hospital.doctors).map(([dept, doctorsList]) => (
                              <div key={dept} className="dept-doctors">
                                <div className="dept-name">{dept}</div>
                                {doctorsList.map((doctor, idx) => (
                                  <div key={doctor.id || `${dept}-${idx}`} className="doctor-card">
                                    <div className="doctor-avatar">
                                      {doctor.image ? (
                                        <img
                                          src={doctor.image}
                                          alt={doctor.name}
                                          className="doctor-avatar-image"
                                          loading="lazy"
                                        />
                                      ) : (
                                        doctor.initials
                                      )}
                                    </div>
                                    <div className="doctor-info">
                                      <p className="doctor-name">{doctor.name}</p>
                                      <p className="doctor-experience">{doctor.experience}</p>
                                      <p className="doctor-rating">⭐ {doctor.rating}/5</p>
                                      <p className="doctor-queue">
                                        Queue: {doctor.queueLength || 0} • Wait: {doctor.estimatedWaitTime || 0} min
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {hospital.receptionStaff && hospital.receptionStaff.length > 0 && (
                        <div className="reception-section">
                          <h5 className="reception-title">🧑‍💼 Reception Team</h5>
                          <div className="reception-grid">
                            {hospital.receptionStaff.map((member) => (
                              <div key={member.id} className="reception-card">
                                <div className="reception-avatar">
                                  {member.image ? (
                                    <img
                                      src={member.image}
                                      alt={member.name}
                                      className="reception-avatar-image"
                                      loading="lazy"
                                    />
                                  ) : (
                                    member.initials
                                  )}
                                </div>
                                <div className="reception-info">
                                  <p className="reception-name">{member.name}</p>
                                  <p className="reception-shift">{member.shift}</p>
                                  <p className="reception-phone">📞 {member.phone}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="hospital-actions">
                      <button
                        className="btn btn-outline"
                        onClick={() => callHospital(hospital)}
                      >
                        <span>📞</span> Call
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => openMapDirections(hospital)}
                      >
                        <span>🗺️</span> Directions
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => bookHospitalVisit(hospital)}
                      >
                        <span>📋</span> Book Visit
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">
                  {loadingHospitals
                    ? 'Loading hospital data...'
                    : `No hospitals found within ${NEARBY_RADIUS_KM} km.`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showBookAppointment && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <span className="modal-icon">📅</span>
                Book Appointment
              </h3>
              <button
                onClick={() => setShowBookAppointment(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label htmlFor="hospital">Hospital</label>
                <select
                  id="hospital"
                  value={appointmentForm.hospital.name}
                  onChange={(e) => handleHospitalSelection(e.target.value)}
                  required
                >
                  <option value="">
                    {nearbyHospitals.length > 0 ? 'Select hospital' : 'No hospitals available'}
                  </option>
                  {nearbyHospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.name}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
                {nearbyHospitals.length === 0 && (
                  <p className="form-hint">Refresh nearby hospitals to choose a hospital doctor.</p>
                )}
              </div>

              {appointmentForm.hospital.name && (
                <div className="selected-hospital">
                  <h4>📍 Selected Hospital</h4>
                  <div className="hospital-info-display">
                    <p><strong>{appointmentForm.hospital.name}</strong></p>
                    <p>📍 {appointmentForm.hospital.address}</p>
                    <p>📞 {appointmentForm.hospital.phone}</p>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="department">Department</label>
                <select
                  id="department"
                  value={appointmentForm.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  required
                >
                  {hospitalDepartmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="doctor">Doctor</label>
                <select
                  id="doctor"
                  value={appointmentForm.doctor.id}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  required
                  disabled={!selectedHospital || doctorOptions.length === 0}
                >
                  <option value="">
                    {!selectedHospital
                      ? 'Select hospital first'
                      : doctorOptions.length > 0
                        ? 'Select doctor'
                        : 'No doctors available for selected department'}
                  </option>
                  {doctorOptions.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.department})
                    </option>
                  ))}
                </select>
                {selectedHospital && doctorOptions.length === 0 && (
                  <p className="form-hint">
                    No doctors are listed for this department at the selected hospital.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="appointmentDate">Appointment Date</label>
                <input
                  type="date"
                  id="appointmentDate"
                  value={appointmentForm.appointmentDate}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="timeSlot">Time Slot</label>
                <select
                  id="timeSlot"
                  value={appointmentForm.timeSlot}
                  onChange={(e) => setAppointmentForm((prev) => ({ ...prev, timeSlot: e.target.value }))}
                  required
                  disabled={!appointmentForm.doctor.name}
                >
                  <option value="">
                    {appointmentForm.doctor.name ? 'Select a time slot' : 'Select doctor first'}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payment-module">
                <div className="payment-header">
                  <h4>💳 Payment</h4>
                  <span className={`payment-status ${paymentState.status}`}>
                    {isPaymentCompleted ? 'PAID' : 'PENDING'}
                  </span>
                </div>
                <p className="payment-amount">
                  Consultation Fee: ₹{paymentState.amount} ({paymentState.currency})
                </p>

                <div className="form-group">
                  <label htmlFor="paymentMethod">Payment Method</label>
                  <select
                    id="paymentMethod"
                    value={paymentState.method}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                  >
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                {paymentState.method === 'upi' ? (
                  <div className="form-group">
                    <label htmlFor="upiId">UPI ID</label>
                    <input
                      id="upiId"
                      type="text"
                      value={paymentState.upiId}
                      onChange={(e) => handlePaymentInputChange('upiId', e.target.value)}
                      placeholder="name@bank"
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="cardNumber">Card Number</label>
                      <input
                        id="cardNumber"
                        type="text"
                        value={paymentState.cardNumber}
                        onChange={(e) => handlePaymentInputChange('cardNumber', e.target.value)}
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                    <div className="payment-card-grid">
                      <div className="form-group">
                        <label htmlFor="cardHolder">Card Holder</label>
                        <input
                          id="cardHolder"
                          type="text"
                          value={paymentState.cardHolder}
                          onChange={(e) => handlePaymentInputChange('cardHolder', e.target.value)}
                          placeholder="Name on card"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="cardExpiry">Expiry (MM/YY)</label>
                        <input
                          id="cardExpiry"
                          type="text"
                          value={paymentState.expiry}
                          onChange={(e) => handlePaymentInputChange('expiry', e.target.value)}
                          placeholder="MM/YY"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="cardCvv">CVV</label>
                        <input
                          id="cardCvv"
                          type="password"
                          value={paymentState.cvv}
                          onChange={(e) => handlePaymentInputChange('cvv', e.target.value)}
                          placeholder="***"
                        />
                      </div>
                    </div>
                  </>
                )}

                {isPaymentCompleted && (
                  <div className="payment-reference">
                    <p><strong>Transaction:</strong> {paymentState.transactionId}</p>
                    <p><strong>Paid:</strong> {new Date(paymentState.paidAt).toLocaleString()}</p>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-outline payment-btn"
                  onClick={handleProcessPayment}
                  disabled={!canProcessPayment || isProcessingPayment || isPaymentCompleted}
                >
                  {isProcessingPayment
                    ? 'Processing payment...'
                    : isPaymentCompleted
                      ? 'Payment Completed'
                      : `Pay ₹${paymentState.amount}`}
                </button>
                <p className="form-hint">
                  Payment is required before appointment booking and queue confirmation.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="reason">Reason for Visit</label>
                <textarea
                  id="reason"
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please describe your symptoms or reason for the appointment"
                  rows="4"
                  required
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary" disabled={!isPaymentCompleted}>
                  <span>📅</span> Book Appointment
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
      
      {/* Health & Fitness Section */}
      <div className="health-section">
        <h2>🏃‍♂️ Health & Fitness Tracker</h2>
        <div className="health-components-grid">
          <Exercise3DCard />
          <HealthTips3D />
          <FitnessGoals3D />
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
