const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate reference is required']
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required']
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
      default: undefined
    },
    status: {
      type: String,
      required: [true, 'Application status is required'],
      enum: {
        values: ['pending', 'reviewing', 'accepted', 'rejected'],
        message: '{VALUE} is not a valid application status'
      },
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring one application per candidate per job (prevents race-condition duplicates)
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
