/**
 * User Model
 * Defines the schema for users in the system
 * Supports roles: Student, Research Scholar, Faculty
 * Stores authentication credentials and profile information
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['Student', 'Research Scholar', 'Faculty'],
      default: 'Student',
    },
    profile: {
      institution: {
        type: String,
        trim: true,
      },
      department: {
        type: String,
        trim: true,
      },
      researchDomain: {
        type: String,
        trim: true,
      },
    },
    usageStats: {
      papersAnalyzed: {
        type: Number,
        default: 0,
      },
      totalAnalysisTime: {
        type: Number, // in seconds
        default: 0,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified (not on other updates)
  if (!this.isModified('password')) {
    return next();
  }

  // Hash password with cost of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password for login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
