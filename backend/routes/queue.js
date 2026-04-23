const express = require('express');
const router = express.Router();
const {
  joinQueue,
  getQueueByDepartment,
  getPatientQueueStatus,
  updateQueueStatus,
  updateQueuePriority,
  leaveQueue,
  getHospitalDoctorWaitTimes,
  getQueueStats,
} = require('../controllers/queueController');
const { protect, authorize } = require('../middleware/auth');

// Patient routes
router.post('/join', protect, authorize('patient'), joinQueue);
router.get('/patient/:patientId', protect, getPatientQueueStatus);
router.get('/wait-times/hospitals', protect, getHospitalDoctorWaitTimes);

// Attendant routes
router.get('/department/:department', protect, authorize('attendant', 'doctor', 'reception'), getQueueByDepartment);
router.put('/:queueId/status', protect, authorize('attendant', 'doctor'), updateQueueStatus);
router.put('/:queueId/priority', protect, authorize('attendant', 'doctor', 'reception'), updateQueuePriority);

// Common routes
router.delete('/:queueId', protect, leaveQueue);
router.get('/stats/dashboard', protect, getQueueStats);

module.exports = router;
