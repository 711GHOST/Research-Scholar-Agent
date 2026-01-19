/**
 * Database Configuration
 * Establishes MongoDB connection using Mongoose
 * Handles connection events and errors
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("Mongo URI:", process.env.MONGODB_URI);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
