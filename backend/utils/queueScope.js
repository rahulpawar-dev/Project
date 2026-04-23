const Queue = require('../models/Queue');

const WAIT_TIME_PER_PATIENT_MINUTES = 15;
const ACTIVE_QUEUE_STATUSES = ['waiting', 'in-progress'];
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

const recalcQueuePositions = async (scope = {}) => {
  const activeFilter = buildActiveQueueFilter(scope);
  if (!activeFilter) {
    return;
  }

  const activeQueue = await Queue.find(activeFilter).sort({ checkInTime: 1, createdAt: 1 });

  const updates = activeQueue
    .map((entry, index) => {
      const queuePosition = index + 1;
      const estimatedWaitTime = queuePosition * WAIT_TIME_PER_PATIENT_MINUTES;

      if (
        entry.queuePosition !== queuePosition
        || entry.estimatedWaitTime !== estimatedWaitTime
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
