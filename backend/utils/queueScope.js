const Queue = require('../models/Queue');

const WAIT_TIME_PER_PATIENT_MINUTES = 15;
const ACTIVE_QUEUE_STATUSES = ['waiting', 'in-progress'];
const QUEUE_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};
const QUEUE_STATUS_ORDER = {
  'in-progress': 0,
  waiting: 1,
};
const EMPTY_HOSPITAL = { name: '', address: '', phone: '' };
const EMPTY_DOCTOR = {
  id: '',
  name: '',
  department: '',
  experience: '',
  phone: '',
  image: '',
};

const normalizeHospital = (hospital = EMPTY_HOSPITAL) => ({
  name: String(hospital?.name || '').trim(),
  address: String(hospital?.address || '').trim(),
  phone: String(hospital?.phone || '').trim(),
});

const normalizeDoctor = (doctor = EMPTY_DOCTOR, fallbackDepartment = '') => ({
  id: String(doctor?.id || '').trim(),
  name: String(doctor?.name || '').trim(),
  department: String(doctor?.department || fallbackDepartment || '').trim(),
  experience: String(doctor?.experience || '').trim(),
  phone: String(doctor?.phone || '').trim(),
  image: String(doctor?.image || '').trim(),
});

const buildQueueScopeFilter = ({
  department = '',
  hospital = null,
  hospitalName = '',
  doctor = null,
  doctorId = '',
  doctorName = '',
} = {}) => {
  const normalizedDepartment = String(department || '').trim();
  if (!normalizedDepartment) {
    return {};
  }

  const filter = { department: normalizedDepartment };

  const normalizedHospitalName = String(hospitalName || hospital?.name || '').trim();
  if (normalizedHospitalName) {
    filter['hospital.name'] = normalizedHospitalName;
  }

  const normalizedDoctorId = String(doctorId || doctor?.id || '').trim();
  const normalizedDoctorName = String(doctorName || doctor?.name || '').trim();
  if (normalizedDoctorId) {
    filter['doctor.id'] = normalizedDoctorId;
  } else if (normalizedDoctorName) {
    filter['doctor.name'] = normalizedDoctorName;
  }

  return filter;
};

const buildActiveQueueFilter = (scope = {}) => {
  const scopeFilter = buildQueueScopeFilter(scope);
  if (!scopeFilter.department) {
    return null;
  }

  return {
    ...scopeFilter,
    status: { $in: ACTIVE_QUEUE_STATUSES },
  };
};

const getQueueScopeFromEntry = (entry) => ({
  department: String(entry?.department || '').trim(),
  hospital: normalizeHospital(entry?.hospital || EMPTY_HOSPITAL),
  doctor: normalizeDoctor(entry?.doctor || EMPTY_DOCTOR, entry?.department || ''),
});

const toTimeValue = (value) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getPriorityRank = (priority = 'low') => {
  const normalizedPriority = String(priority || '').trim().toLowerCase();
  return QUEUE_PRIORITY_ORDER[normalizedPriority] ?? QUEUE_PRIORITY_ORDER.low;
};

const getStatusRank = (status = 'waiting') => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return QUEUE_STATUS_ORDER[normalizedStatus] ?? QUEUE_STATUS_ORDER.waiting;
};

const roundToSingleDecimal = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10;

const getInProgressRemainingMinutes = (entry, nowTimestamp) => {
  const inProgressStartTime = toTimeValue(entry?.inProgressAt);
  if (!inProgressStartTime) {
    return WAIT_TIME_PER_PATIENT_MINUTES;
  }

  const elapsedMinutes = Math.max((nowTimestamp - inProgressStartTime) / (1000 * 60), 0);
  return roundToSingleDecimal(
    Math.max(WAIT_TIME_PER_PATIENT_MINUTES - elapsedMinutes, 0)
  );
};

const recalcQueuePositions = async (scope = {}) => {
  const activeFilter = buildActiveQueueFilter(scope);
  if (!activeFilter) {
    return;
  }

  const activeQueue = await Queue.find(activeFilter);

  activeQueue.sort((left, right) => {
    const statusDifference = getStatusRank(left.status) - getStatusRank(right.status);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    const priorityDifference = getPriorityRank(left.priority) - getPriorityRank(right.priority);
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const checkInDifference = toTimeValue(left.checkInTime) - toTimeValue(right.checkInTime);
    if (checkInDifference !== 0) {
      return checkInDifference;
    }

    return toTimeValue(left.createdAt) - toTimeValue(right.createdAt);
  });

  const nowTimestamp = Date.now();
  let cumulativeWaitMinutes = 0;

  const updates = activeQueue
    .map((entry, index) => {
      const queuePosition = index + 1;
      const shouldSetInProgressAt = entry.status === 'in-progress' && !entry.inProgressAt;
      if (shouldSetInProgressAt) {
        entry.inProgressAt = new Date(nowTimestamp);
      }

      const slotDurationMinutes = entry.status === 'in-progress'
        ? getInProgressRemainingMinutes(entry, nowTimestamp)
        : WAIT_TIME_PER_PATIENT_MINUTES;
      const estimatedWaitTime = roundToSingleDecimal(cumulativeWaitMinutes + slotDurationMinutes);
      cumulativeWaitMinutes += slotDurationMinutes;
      const currentEstimatedWaitTime = Number(entry.estimatedWaitTime || 0);
      const hasEstimatedWaitTimeChanged =
        Math.abs(currentEstimatedWaitTime - estimatedWaitTime) >= 0.1;

      if (
        entry.queuePosition !== queuePosition
        || hasEstimatedWaitTimeChanged
        || shouldSetInProgressAt
      ) {
        entry.queuePosition = queuePosition;
        entry.estimatedWaitTime = estimatedWaitTime;
        return entry.save();
      }

      return null;
    })
    .filter(Boolean);

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};

const getQueueLengthForScope = async (scope = {}) => {
  const activeFilter = buildActiveQueueFilter(scope);
  if (!activeFilter) {
    return 0;
  }
  return Queue.countDocuments(activeFilter);
};

module.exports = {
  WAIT_TIME_PER_PATIENT_MINUTES,
  ACTIVE_QUEUE_STATUSES,
  EMPTY_HOSPITAL,
  EMPTY_DOCTOR,
  normalizeHospital,
  normalizeDoctor,
  buildQueueScopeFilter,
  buildActiveQueueFilter,
  getQueueScopeFromEntry,
  recalcQueuePositions,
  getQueueLengthForScope,
};
