const Queue = require('../models/Queue');
const User = require('../models/User');
const {
  WAIT_TIME_PER_PATIENT_MINUTES,
  buildActiveQueueFilter,
  getQueueLengthForScope,
  getQueueScopeFromEntry,
  normalizeDoctor,
  normalizeHospital,
  recalcQueuePositions,
} = require('../utils/queueScope');
const { normalizePayment, validatePaidPayment } = require('../utils/paymentValidation');
const { ensureHospitalScope, belongsToHospital, normalizeHospitalName } = require('../utils/hospitalAccess');

const parseHospitalNamesQuery = (hospitalNamesQuery) => {
  const rawValues = Array.isArray(hospitalNamesQuery)
    ? hospitalNamesQuery
    : typeof hospitalNamesQuery === 'string'
      ? hospitalNamesQuery.split(',')
      : [];

  const uniqueHospitalNames = new Map();

  rawValues.forEach((value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return;
    }
    const normalized = normalizeHospitalName(trimmed);
    if (!normalized || uniqueHospitalNames.has(normalized)) {
      return;
    }
    uniqueHospitalNames.set(normalized, trimmed);
  });

  return Array.from(uniqueHospitalNames.values());
};

const buildDoctorQueueKey = ({ doctorId = '', doctorName = '', department = '' }) => {
  const normalizedDoctorId = String(doctorId || '').trim();
  if (normalizedDoctorId) {
    return `id:${normalizedDoctorId}`;
  }

  const normalizedDoctorName = normalizeHospitalName(doctorName);
  if (!normalizedDoctorName) {
    return '';
  }

  const normalizedDepartment = normalizeHospitalName(department);
  return `name:${normalizedDoctorName}::dept:${normalizedDepartment}`;
};

// @route   POST /api/queue/join
// @desc    Join the queue (Patient action)
// @access  Private (Patient only)
exports.joinQueue = async (req, res) => {
  try {
    const { department, hospital, doctor, payment } = req.body;
    const patientId = req.user._id;

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a department',
      });
    }

    const queueScope = {
      department,
      hospital: normalizeHospital(hospital),
      doctor: normalizeDoctor(doctor, department),
    };

    // Check if patient already in queue
    const existingQueue = await Queue.findOne({
      patientId,
      status: { $in: ['waiting', 'in-progress'] },
    });

    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: 'You are already in the queue',
      });
    }

    const normalizedPayment = normalizePayment(payment);
    const paymentValidation = validatePaidPayment(normalizedPayment, { minAmount: 1 });
    if (!paymentValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: paymentValidation.message,
      });
    }

    await recalcQueuePositions(queueScope);

    // Get current queue position
    const queueCount = await getQueueLengthForScope(queueScope);

    const newQueue = await Queue.create({
      patientId,
      patientName: req.user.name,
      department,
      hospital: queueScope.hospital,
      doctor: queueScope.doctor,
      payment: normalizedPayment,
      queuePosition: queueCount + 1,
      priority: 'low',
      estimatedWaitTime: (queueCount + 1) * WAIT_TIME_PER_PATIENT_MINUTES,
    });

    res.status(201).json({
      success: true,
      message: 'Joined queue successfully',
      data: newQueue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/queue/:department
// @desc    Get queue for a specific department
// @access  Private
exports.getQueueByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { hospitalName, doctorId, doctorName } = req.query;
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }

    const queueScope = {
      department,
      hospitalName: hospitalScope.isScopedRole ? hospitalScope.hospitalName : hospitalName,
      doctorId,
      doctorName,
    };
    const activeQueueFilter = buildActiveQueueFilter(queueScope);
    if (!activeQueueFilter) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid department',
      });
    }

    await recalcQueuePositions(queueScope);

    const queue = await Queue.find(activeQueueFilter)
      .sort({ queuePosition: 1 })
      .populate('patientId', 'name phone email')
      .populate('attendantId', 'name');

    res.status(200).json({
      success: true,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/queue/patient/:patientId
// @desc    Get patient's queue status
// @access  Private
exports.getPatientQueueStatus = async (req, res) => {
  try {
    const { patientId } = req.params;
    const requester = req.user;
    const hospitalScope = ensureHospitalScope(res, requester);
    if (!hospitalScope) {
      return;
    }

    if (requester.role === 'patient' && requester._id.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this queue status',
      });
    }

    const queueFilter = {
      patientId,
      status: { $in: ['waiting', 'in-progress'] },
    };

    if (requester.role !== 'patient' && hospitalScope.isScopedRole) {
      queueFilter['hospital.name'] = hospitalScope.hospitalName;
    }

    const queueStatus = await Queue.findOne(queueFilter)
      .sort({ checkInTime: 1, createdAt: 1 })
      .populate('attendantId', 'name');

    if (!queueStatus) {
      return res.status(404).json({
        success: false,
        message: 'Patient not in queue',
      });
    }

    const queueScope = getQueueScopeFromEntry(queueStatus);
    await recalcQueuePositions(queueScope);

    const refreshedQueueStatus = await Queue.findById(queueStatus._id).populate(
      'attendantId',
      'name'
    );
    if (!refreshedQueueStatus) {
      return res.status(404).json({
        success: false,
        message: 'Patient not in queue',
      });
    }

    const queueLength = await getQueueLengthForScope(queueScope);
    const queuePosition = Number(refreshedQueueStatus.queuePosition || 0);
    const peopleAhead = Math.max(queuePosition - 1, 0);

    res.status(200).json({
      success: true,
      data: {
        ...refreshedQueueStatus.toObject(),
        queueLength,
        peopleAhead,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/queue/:queueId/status
// @desc    Update queue status (Attendant action)
// @access  Private (Attendant only)
exports.updateQueueStatus = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { status } = req.body;
    const attendantId = req.user._id;
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }

    const queueEntry = await Queue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found',
      });
    }

    if (
      hospitalScope.isScopedRole &&
      !belongsToHospital(queueEntry.hospital?.name, hospitalScope.hospitalName)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update queue entries from another hospital',
      });
    }

    queueEntry.status = status;

    if (status === 'in-progress') {
      queueEntry.attendantId = attendantId;
    }

    if (status === 'completed') {
      queueEntry.completedAt = new Date();
      const waitTime = (queueEntry.completedAt - queueEntry.checkInTime) / (1000 * 60);
      queueEntry.totalWaitTime = Math.round(waitTime);
    } else {
      queueEntry.completedAt = null;
    }

    await queueEntry.save();

    if (status === 'completed') {
      await User.findByIdAndUpdate(queueEntry.patientId, {
        $inc: { totalVisits: 1 },
      });
    }

    if (status === 'completed' || status === 'cancelled') {
      await recalcQueuePositions(getQueueScopeFromEntry(queueEntry));
    }

    res.status(200).json({
      success: true,
      message: 'Queue status updated successfully',
      data: queueEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/queue/:queueId/priority
// @desc    Update queue priority (Reception/Attendant)
// @access  Private
exports.updateQueuePriority = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { priority } = req.body;
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }

    const queueEntry = await Queue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found',
      });
    }

    if (
      hospitalScope.isScopedRole &&
      !belongsToHospital(queueEntry.hospital?.name, hospitalScope.hospitalName)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update queue entries from another hospital',
      });
    }

    queueEntry.priority = priority;
    await queueEntry.save();

    res.status(200).json({
      success: true,
      message: 'Queue priority updated',
      data: queueEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/queue/:queueId
// @desc    Leave/cancel queue
// @access  Private
exports.leaveQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    const requester = req.user;
    const hospitalScope = ensureHospitalScope(res, requester);
    if (!hospitalScope) {
      return;
    }

    const queueEntry = await Queue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found',
      });
    }

    if (
      requester.role === 'patient' &&
      queueEntry.patientId.toString() !== requester._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this queue entry',
      });
    }

    if (
      requester.role !== 'patient' &&
      hospitalScope.isScopedRole &&
      !belongsToHospital(queueEntry.hospital?.name, hospitalScope.hospitalName)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel queue entries from another hospital',
      });
    }

    queueEntry.status = 'cancelled';
    await queueEntry.save();
    await recalcQueuePositions(getQueueScopeFromEntry(queueEntry));

    res.status(200).json({
      success: true,
      message: 'Removed from queue',
      data: queueEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/queue/wait-times/hospitals
// @desc    Get queue-based wait times grouped by hospital and doctor
// @access  Private
exports.getHospitalDoctorWaitTimes = async (req, res) => {
  try {
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }

    const requestedHospitalNames = parseHospitalNamesQuery(req.query.hospitalNames);
    const queueFilter = {
      status: { $in: ['waiting', 'in-progress'] },
    };

    if (hospitalScope.isScopedRole) {
      queueFilter['hospital.name'] = hospitalScope.hospitalName;
    } else if (requestedHospitalNames.length > 0) {
      queueFilter['hospital.name'] = { $in: requestedHospitalNames };
    }

    const queueEntries = await Queue.find(queueFilter)
      .select('department hospital doctor')
      .lean();

    const hospitalSummaryMap = new Map();

    const ensureHospitalSummary = (hospitalName) => {
      const normalizedHospital = normalizeHospitalName(hospitalName);
      if (!normalizedHospital) {
        return null;
      }

      if (!hospitalSummaryMap.has(normalizedHospital)) {
        hospitalSummaryMap.set(normalizedHospital, {
          hospitalName: String(hospitalName || '').trim(),
          queueLength: 0,
          doctors: new Map(),
        });
      }

      return hospitalSummaryMap.get(normalizedHospital);
    };

    queueEntries.forEach((entry) => {
      const hospitalName = String(entry?.hospital?.name || '').trim();
      const hospitalSummary = ensureHospitalSummary(hospitalName);
      if (!hospitalSummary) {
        return;
      }

      hospitalSummary.queueLength += 1;

      const doctorId = String(entry?.doctor?.id || '').trim();
      const doctorName = String(entry?.doctor?.name || '').trim();
      const department = String(entry?.doctor?.department || entry?.department || '').trim();
      const doctorKey = buildDoctorQueueKey({ doctorId, doctorName, department });

      if (!doctorKey) {
        return;
      }

      if (!hospitalSummary.doctors.has(doctorKey)) {
        hospitalSummary.doctors.set(doctorKey, {
          doctorId,
          doctorName,
          department,
          queueLength: 0,
        });
      }

      hospitalSummary.doctors.get(doctorKey).queueLength += 1;
    });

    if (!hospitalScope.isScopedRole && requestedHospitalNames.length > 0) {
      requestedHospitalNames.forEach((hospitalName) => {
        ensureHospitalSummary(hospitalName);
      });
    }

    const data = Array.from(hospitalSummaryMap.values())
      .map((hospitalSummary) => ({
        hospitalName: hospitalSummary.hospitalName,
        queueLength: hospitalSummary.queueLength,
        estimatedWaitTime: hospitalSummary.queueLength * WAIT_TIME_PER_PATIENT_MINUTES,
        doctors: Array.from(hospitalSummary.doctors.values())
          .map((doctorSummary) => ({
            ...doctorSummary,
            estimatedWaitTime: doctorSummary.queueLength * WAIT_TIME_PER_PATIENT_MINUTES,
          }))
          .sort(
            (a, b) =>
              b.queueLength - a.queueLength
              || String(a.doctorName || '').localeCompare(String(b.doctorName || ''))
          ),
      }))
      .sort((a, b) => a.hospitalName.localeCompare(b.hospitalName));

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/queue/stats/dashboard
// @desc    Get queue statistics for dashboard
// @access  Private
exports.getQueueStats = async (req, res) => {
  try {
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }
    const hospitalFilter =
      hospitalScope.isScopedRole && hospitalScope.hospitalName
        ? { 'hospital.name': hospitalScope.hospitalName }
        : {};

    const totalWaiting = await Queue.countDocuments({
      ...hospitalFilter,
      status: 'waiting',
    });
    const totalInProgress = await Queue.countDocuments({
      ...hospitalFilter,
      status: 'in-progress',
    });
    const totalCompleted = await Queue.countDocuments({
      ...hospitalFilter,
      status: 'completed',
    });

    const departmentStats = await Queue.aggregate([
      {
        $match: { ...hospitalFilter, status: { $in: ['waiting', 'in-progress'] } },
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$estimatedWaitTime' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalWaiting,
        totalInProgress,
        totalCompleted,
        departmentStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
