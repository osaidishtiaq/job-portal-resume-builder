const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
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
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['candidate', 'employer'],
        message: '{VALUE} is not a valid role. Allowed roles are candidate or employer'
      },
      default: 'candidate'
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
