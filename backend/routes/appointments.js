const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getPatientAppointments,
  getDepartmentAppointments,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

// Appointment routes
router.post('/', protect, authorize('patient', 'reception'), createAppointment);
router.get('/patient/:patientId', protect, getPatientAppointments);
router.get('/department/:department', protect, authorize('reception', 'attendant', 'doctor'), getDepartmentAppointments);
router.put('/:appointmentId', protect, updateAppointment);
router.delete('/:appointmentId', protect, cancelAppointment);

// Available slots
router.get('/slots/:department/:date', protect, getAvailableSlots);

module.exports = router;
