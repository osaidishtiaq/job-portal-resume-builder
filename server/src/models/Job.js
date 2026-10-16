const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters'],
      maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [2, 'Location must be at least 2 characters'],
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: {
        values: ['full-time', 'part-time', 'contract', 'internship'],
        message: '{VALUE} is not a valid job type. Allowed: full-time, part-time, contract, internship'
      }
    },
    workplaceMode: {
      type: String,
      required: [true, 'Workplace mode is required'],
      enum: {
        values: ['onsite', 'hybrid', 'remote'],
        message: '{VALUE} is not a valid workplace mode. Allowed: onsite, hybrid, remote'
      }
    },
    salaryMin: {
      type: Number,
      min: [0, 'Minimum salary must be a non-negative number'],
      validate: {
        validator: function (val) {
          if (val !== undefined && val !== null && this.salaryMax !== undefined && this.salaryMax !== null) {
            return val <= this.salaryMax;
          }
          return true;
        },
        message: 'Minimum salary cannot exceed maximum salary'
      },
      default: undefined
    },
    salaryMax: {
      type: Number,
      min: [0, 'Maximum salary must be a non-negative number'],
      validate: {
        validator: function (val) {
          if (val !== undefined && val !== null && this.salaryMin !== undefined && this.salaryMin !== null) {
            return this.salaryMin <= val;
          }
          return true;
        },
        message: 'Minimum salary cannot exceed maximum salary'
      },
      default: undefined
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [10, 'Job description must be at least 10 characters'],
      maxlength: [5000, 'Job description cannot exceed 5000 characters']
    },
    requirements: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [200, 'Requirement item cannot exceed 200 characters']
        }
      ],
      validate: {
        validator: (arr) => !arr || arr.length <= 50,
        message: 'Requirements cannot exceed 50 items'
      },
      default: []
    },
    status: {
      type: String,
      required: [true, 'Job status is required'],
      enum: {
        values: ['active', 'closed'],
        message: '{VALUE} is not a valid status. Allowed: active, closed'
      },
      default: 'active'
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer reference is required']
    }
  },
  {
    timestamps: true
  }
);

// Pre-validation constraint: salaryMin cannot exceed salaryMax if both are provided
jobSchema.pre('validate', function (next) {
  if (
    this.salaryMin !== undefined &&
    this.salaryMin !== null &&
    this.salaryMax !== undefined &&
    this.salaryMax !== null &&
    this.salaryMin > this.salaryMax
  ) {
    this.invalidate('salaryMin', 'Minimum salary cannot exceed maximum salary');
  }
  next();
});

// Compound indexes for optimal query performance
jobSchema.index({ employer: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
