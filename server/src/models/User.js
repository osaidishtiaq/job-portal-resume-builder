const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Authentication version – increments on password change/reset to invalidate old JWTs
    authVersion: {
      type: Number,
      default: 0,
      select: false
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      // Stores hashed password (e.g. bcrypt hash in future auth phase), never plaintext
      type: String,
      required: [true, 'Password hash is required'],
      minlength: [6, 'Password hash must be at least 6 characters'],
      select: false
    },
    passwordChangedAt: {
      type: Date,
      select: false
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpire: {
      type: Date,
      select: false
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['candidate', 'employer'],
        message: '{VALUE} is not a valid role. Allowed roles are candidate or employer'
      },
      default: 'candidate',
    },
      // Optional profile fields
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  // Candidate‑only field
  headline: {
    type: String,
    trim: true,
    maxlength: [150, 'Headline cannot exceed 150 characters']
  },
  // Employer‑only fields
  companyName: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  companyWebsite: {
    type: String,
    trim: true,
    maxlength: [200, 'Company website URL cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        try {
          const url = new URL(v);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) { return false; }
      },
      message: props => `${props.value} is not a valid http:// or https:// URL`
    }
  },
  companyDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Company description cannot exceed 500 characters']
  },
},
{
  timestamps: true
}
);

const User = mongoose.model('User', userSchema);

module.exports = User;
