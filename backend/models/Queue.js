const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
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
    status: {
      type: String,
      enum: ['waiting', 'in-progress', 'completed', 'cancelled'],
      default: 'waiting',
    },
    queuePosition: {
      type: Number,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    estimatedWaitTime: {
      type: Number, // in minutes
      default: 15,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    inProgressAt: {
      type: Date,
      default: null,
    },
    totalWaitTime: {
      type: Number, // in minutes
      default: 0,
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
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
queueSchema.index({ department: 1, status: 1 });
queueSchema.index({ patientId: 1 });
queueSchema.index({ appointmentId: 1 });
queueSchema.index({ 'hospital.name': 1, department: 1, status: 1 });
queueSchema.index({ 'doctor.id': 1, department: 1, status: 1 });
queueSchema.index({ 'doctor.name': 1, department: 1, status: 1 });

module.exports = mongoose.model('Queue', queueSchema);
