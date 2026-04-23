const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hospital: {
      name: {
        type: String,
        default: '',
      },
      address: {
        type: String,
        default: '',
      },
      phone: {
        type: String,
        default: '',
      },
    },
    doctor: {
      id: {
        type: String,
        default: '',
      },
      name: {
        type: String,
        default: '',
      },
      department: {
        type: String,
        default: '',
      },
      experience: {
        type: String,
        default: '',
      },
      phone: {
        type: String,
        default: '',
      },
      image: {
        type: String,
        default: '',
      },
    },
    payment: {
      method: {
        type: String,
        enum: ['', 'upi', 'card', 'netbanking', 'wallet'],
        default: '',
      },
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      transactionId: {
        type: String,
        default: '',
      },
      paidAt: {
        type: Date,
        default: null,
      },
      payerReference: {
        type: String,
        default: '',
      },
    },
    department: {
      type: String,
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
    },
    reason: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    attendantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ department: 1, appointmentDate: 1 });
appointmentSchema.index({ 'hospital.name': 1, appointmentDate: 1 });
appointmentSchema.index({ 'doctor.id': 1, appointmentDate: 1, timeSlot: 1 });
appointmentSchema.index({ 'doctor.name': 1, appointmentDate: 1, timeSlot: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
