/**
 * User Model
 * Stores authentication credentials, profile, verification state and the
 * user's subscription. Supports roles: Student, Research Scholar, Faculty.
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
    emailVerified: { type: Boolean, default: false },
    phone: { type: String, trim: true, default: '' },
    phoneVerified: { type: Boolean, default: false },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['Student', 'Research Scholar', 'Faculty'],
      default: 'Student',
    },
    profile: {
      institution: { type: String, trim: true },
      department: { type: String, trim: true },
      researchDomain: { type: String, trim: true },
      bio: { type: String, trim: true, maxlength: 500 },
    },
    subscription: {
      plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
      status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled', 'past_due'],
        default: 'active', // free plan is active by default
      },
      provider: { type: String, default: '' }, // e.g. 'razorpay'
      providerRef: { type: String, default: '' }, // order/subscription id
      currentPeriodEnd: { type: Date },
    },
    usageStats: {
      papersAnalyzed: { type: Number, default: 0 },
      totalAnalysisTime: { type: Number, default: 0 }, // seconds
    },
  },
  { timestamps: true }
);

// Hash password before saving (only when modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Shared serializer so controllers return a consistent user shape
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    emailVerified: this.emailVerified,
    phone: this.phone,
    phoneVerified: this.phoneVerified,
    role: this.role,
    profile: this.profile,
    subscription: this.subscription,
    usageStats: this.usageStats,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
