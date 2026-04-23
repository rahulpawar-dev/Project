const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');
const User = require('../models/User');
const {
  WAIT_TIME_PER_PATIENT_MINUTES,
  getQueueLengthForScope,
  getQueueScopeFromEntry,
  recalcQueuePositions,
} = require('../utils/queueScope');
const { normalizePayment, validatePaidPayment } = require('../utils/paymentValidation');
const { ensureHospitalScope, belongsToHospital } = require('../utils/hospitalAccess');

const EMPTY_HOSPITAL = { name: '', address: '', phone: '' };
const EMPTY_DOCTOR = {
  id: '',
  name: '',
  department: '',
  experience: '',
  phone: '',
  image: '',
};

const normalizeHospital = (hospital) => ({
  name: String(hospital?.name || '').trim(),
  address: String(hospital?.address || '').trim(),
  phone: String(hospital?.phone || '').trim(),
});

const normalizeDoctor = (doctor, fallbackDepartment = '') => ({
  id: String(doctor?.id || '').trim(),
  name: String(doctor?.name || '').trim(),
  department: String(doctor?.department || fallbackDepartment || '').trim(),
  experience: String(doctor?.experience || '').trim(),
  phone: String(doctor?.phone || '').trim(),
  image: String(doctor?.image || '').trim(),
});

const buildSlotConflictQuery = ({
  appointmentDate,
  timeSlot,
  department,
  hospitalName = '',
  doctor = EMPTY_DOCTOR,
  excludeAppointmentId = null,
}) => {
  const query = {
    appointmentDate,
    timeSlot,
    status: 'scheduled',
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const normalizedHospitalName = String(hospitalName || '').trim();
  if (normalizedHospitalName) {
    query['hospital.name'] = normalizedHospitalName;
  }

  if (doctor?.id) {
    query['doctor.id'] = doctor.id;
  } else if (doctor?.name) {
    query['doctor.name'] = doctor.name;
  } else {
    query.department = department;
  }

  return query;
};

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Private (Reception/Patient)
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, department, appointmentDate, timeSlot, reason, priority, hospital, doctor, payment } = req.body;
    const requester = req.user;
    let effectivePatientId = patientId;
    const hospitalScope = ensureHospitalScope(res, requester);
    if (!hospitalScope) {
      return;
    }

    if (requester.role === 'patient') {
      effectivePatientId = requester._id;
    }

    if (requester.role !== 'patient' && requester.role !== 'reception') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create appointments',
      });
    }

    // Validation
    if (!effectivePatientId || !department || !appointmentDate || !timeSlot || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const requestedHospital = normalizeHospital(hospital || EMPTY_HOSPITAL);
    const normalizedHospital =
      requester.role === 'reception'
        ? { ...requestedHospital, name: hospitalScope.hospitalName }
        : requestedHospital;
    const normalizedDoctor = normalizeDoctor(doctor || EMPTY_DOCTOR, department);
    const normalizedPayment = normalizePayment(payment);

    if (requester.role === 'patient' && !normalizedHospital.name) {
      return res.status(400).json({
        success: false,
        message: 'Please select a hospital before booking an appointment',
      });
    }

    if (requester.role === 'patient' && !normalizedDoctor.name) {
      return res.status(400).json({
        success: false,
        message: 'Please select a doctor before booking an appointment',
      });
    }

    if (requester.role === 'patient') {
      const paymentValidation = validatePaidPayment(normalizedPayment, { minAmount: 1 });
      if (!paymentValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: paymentValidation.message,
        });
      }
    }

    // Check if patient exists
    const patient = await User.findById(effectivePatientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const appointmentSlotDate = new Date(appointmentDate);

    // Check if appointment already exists for same time slot
    const existingAppointment = await Appointment.findOne({
      patientId: effectivePatientId,
      appointmentDate: appointmentSlotDate,
      timeSlot,
      status: { $in: ['scheduled', 'completed'] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Patient already has an appointment at this time',
      });
    }

    const slotConflictQuery = buildSlotConflictQuery({
      appointmentDate: appointmentSlotDate,
      timeSlot,
      department,
      hospitalName: normalizedHospital.name,
      doctor: normalizedDoctor,
    });
    const slotAlreadyBooked = await Appointment.findOne(slotConflictQuery);

    if (slotAlreadyBooked) {
      return res.status(400).json({
        success: false,
        message: normalizedDoctor.name
          ? 'This time slot is already booked for the selected doctor'
          : 'This time slot is already booked for the selected department',
      });
    }

    const appointmentData = {
      patientId: effectivePatientId,
      department,
      appointmentDate: appointmentSlotDate,
      timeSlot,
      reason,
      priority: priority || 'routine',
      hospital: normalizedHospital,
      doctor: normalizedDoctor,
      payment: normalizedPayment,
    };

    const appointment = await Appointment.create(appointmentData);

    const activeQueue = await Queue.findOne({
      patientId: effectivePatientId,
      status: { $in: ['waiting', 'in-progress'] },
    });

    let queueStatus = activeQueue;

    if (!activeQueue) {
      const queueScope = {
        department,
        hospital: normalizedHospital,
        doctor: normalizedDoctor,
      };

      await recalcQueuePositions(queueScope);
      const queueCount = await getQueueLengthForScope(queueScope);

      queueStatus = await Queue.create({
        patientId: effectivePatientId,
        patientName: patient.name,
        appointmentId: appointment._id,
        department,
        hospital: normalizedHospital,
        doctor: normalizedDoctor,
        payment: normalizedPayment,
        queuePosition: queueCount + 1,
        priority: 'low',
        estimatedWaitTime: (queueCount + 1) * WAIT_TIME_PER_PATIENT_MINUTES,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
      queueStatus,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/appointments/:patientId
// @desc    Get patient's appointments
// @access  Private
exports.getPatientAppointments = async (req, res) => {
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
        message: 'You are not authorized to view these appointments',
      });
    }

    if (requester.role !== 'patient' && requester.role !== 'reception') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view these appointments',
      });
    }

    const appointmentsQuery = { patientId };
    if (requester.role === 'reception' && hospitalScope.isScopedRole) {
      appointmentsQuery['hospital.name'] = hospitalScope.hospitalName;
    }

    const appointments = await Appointment.find(appointmentsQuery)
      .populate('patientId', 'name email phone')
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/appointments/department/:department
// @desc    Get appointments for a department
// @access  Private (Reception/Attendant)
exports.getDepartmentAppointments = async (req, res) => {
  try {
    const { department } = req.params;
    const { date, hospitalName, doctorId, doctorName } = req.query;
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }

    let query = { department };
    const requestedHospitalName = String(hospitalName || '').trim();
    const effectiveHospitalName = hospitalScope.isScopedRole
      ? hospitalScope.hospitalName
      : requestedHospitalName;
    if (effectiveHospitalName) {
      query['hospital.name'] = effectiveHospitalName;
    }

    const normalizedDoctorId = String(doctorId || '').trim();
    const normalizedDoctorName = String(doctorName || '').trim();
    if (normalizedDoctorId) {
      query['doctor.id'] = normalizedDoctorId;
    } else if (normalizedDoctorName) {
      query['doctor.name'] = normalizedDoctorName;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/appointments/:appointmentId
// @desc    Update appointment
// @access  Private (Reception/Patient)
exports.updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { appointmentDate, timeSlot, reason, status } = req.body;
    const requester = req.user;
    const hospitalScope = ensureHospitalScope(res, requester);
    if (!hospitalScope) {
      return;
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (
      requester.role === 'patient' &&
      appointment.patientId.toString() !== requester._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this appointment',
      });
    }

    if (requester.role !== 'patient' && requester.role !== 'reception') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this appointment',
      });
    }

    if (
      requester.role !== 'patient' &&
      hospitalScope.isScopedRole &&
      !belongsToHospital(appointment.hospital?.name, hospitalScope.hospitalName)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update appointments from another hospital',
      });
    }

    const nextAppointmentDate = appointmentDate
      ? new Date(appointmentDate)
      : appointment.appointmentDate;
    const nextTimeSlot = timeSlot || appointment.timeSlot;
    const nextStatus = status || appointment.status;

    if (nextStatus === 'scheduled') {
      const normalizedDoctor = normalizeDoctor(appointment.doctor, appointment.department);
      const slotConflictQuery = buildSlotConflictQuery({
        appointmentDate: nextAppointmentDate,
        timeSlot: nextTimeSlot,
        department: appointment.department,
        hospitalName: appointment.hospital?.name,
        doctor: normalizedDoctor,
        excludeAppointmentId: appointmentId,
      });
      const slotAlreadyBooked = await Appointment.findOne(slotConflictQuery);

      if (slotAlreadyBooked) {
        return res.status(400).json({
          success: false,
          message: normalizedDoctor.name
            ? 'This time slot is already booked for the selected doctor'
            : 'This time slot is already booked for the selected department',
        });
      }
    }

    const updateData = {};
    if (appointmentDate) {
      updateData.appointmentDate = nextAppointmentDate;
    }
    if (timeSlot) {
      updateData.timeSlot = timeSlot;
    }
    if (reason) {
      updateData.reason = reason;
    }
    if (status) {
      updateData.status = status;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/appointments/:appointmentId
// @desc    Cancel appointment
// @access  Private (Patient/Reception)
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const requester = req.user;
    const hospitalScope = ensureHospitalScope(res, requester);
    if (!hospitalScope) {
      return;
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (
      requester.role === 'patient' &&
      appointment.patientId.toString() !== requester._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this appointment',
      });
    }

    if (requester.role !== 'patient' && requester.role !== 'reception') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this appointment',
      });
    }

    if (
      requester.role !== 'patient' &&
      hospitalScope.isScopedRole &&
      !belongsToHospital(appointment.hospital?.name, hospitalScope.hospitalName)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel appointments from another hospital',
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    const queueEntry = await Queue.findOne({
      appointmentId: appointment._id,
      status: { $in: ['waiting', 'in-progress'] },
    });

    if (queueEntry) {
      queueEntry.status = 'cancelled';
      await queueEntry.save();
      await recalcQueuePositions(getQueueScopeFromEntry(queueEntry));
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/appointments/available-slots/:department/:date
// @desc    Get available time slots
// @access  Private
exports.getAvailableSlots = async (req, res) => {
  try {
    const { department, date } = req.params;
    const { doctorId, doctorName, hospitalName } = req.query;
    const hospitalScope = ensureHospitalScope(res, req.user);
    if (!hospitalScope) {
      return;
    }

    // Define available slots
    const availableSlots = [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '01:00 PM',
      '01:30 PM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
    ];

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const bookedQuery = {
      appointmentDate: { $gte: startDate, $lt: endDate },
      status: 'scheduled',
    };

    const requestedHospitalName = String(hospitalName || '').trim();
    const effectiveHospitalName = hospitalScope.isScopedRole
      ? hospitalScope.hospitalName
      : requestedHospitalName;
    if (effectiveHospitalName) {
      bookedQuery['hospital.name'] = effectiveHospitalName;
    }

    const normalizedDoctorId = String(doctorId || '').trim();
    const normalizedDoctorName = String(doctorName || '').trim();
    if (normalizedDoctorId) {
      bookedQuery['doctor.id'] = normalizedDoctorId;
    } else if (normalizedDoctorName) {
      bookedQuery['doctor.name'] = normalizedDoctorName;
    } else {
      bookedQuery.department = department;
    }

    const bookedAppointments = await Appointment.find(bookedQuery).select('timeSlot');

    const bookedSlots = bookedAppointments.map((apt) => apt.timeSlot);

    const freeSlots = availableSlots.filter((slot) => !bookedSlots.includes(slot));

    res.status(200).json({
      success: true,
      data: freeSlots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
