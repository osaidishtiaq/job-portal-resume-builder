const mongoose = require('mongoose');

const personalDetailsSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [80, 'Full name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
      maxlength: [100, 'Contact email cannot exceed 100 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
      default: ''
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: ''
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [120, 'Headline cannot exceed 120 characters'],
      default: ''
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [2000, 'Summary cannot exceed 2000 characters'],
      default: ''
    }
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    institution: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: [120, 'Institution name cannot exceed 120 characters']
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true,
      maxlength: [100, 'Qualification cannot exceed 100 characters']
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: [100, 'Field of study cannot exceed 100 characters'],
      default: ''
    },
    startDate: {
      type: String,
      trim: true,
      maxlength: [30, 'Start date cannot exceed 30 characters'],
      default: ''
    },
    endDate: {
      type: String,
      trim: true,
      maxlength: [30, 'End date cannot exceed 30 characters'],
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    }
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters']
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: ''
    },
    startDate: {
      type: String,
      trim: true,
      maxlength: [30, 'Start date cannot exceed 30 characters'],
      default: ''
    },
    endDate: {
      type: String,
      trim: true,
      maxlength: [30, 'End date cannot exceed 30 characters'],
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    }
  },
  { _id: true }
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    personalDetails: {
      type: personalDetailsSchema,
      required: [true, 'Personal details are required'],
      default: () => ({})
    },
    skills: {
      type: [
        {
          type: String,
          required: [true, 'Skill item cannot be empty'],
          trim: true,
          maxlength: [50, 'Skill cannot exceed 50 characters']
        }
      ],
      default: [],
      validate: [
        {
          validator: function (val) {
            return !val || val.length <= 50;
          },
          message: 'Skills cannot exceed 50 items'
        }
      ]
    },
    education: {
      type: [educationSchema],
      default: [],
      validate: [
        {
          validator: function (val) {
            return !val || val.length <= 20;
          },
          message: 'Education cannot exceed 20 entries'
        }
      ]
    },
    experience: {
      type: [experienceSchema],
      default: [],
      validate: [
        {
          validator: function (val) {
            return !val || val.length <= 20;
          },
          message: 'Experience cannot exceed 20 entries'
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
