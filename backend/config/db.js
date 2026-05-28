const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Mongoose version:", mongoose.version);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
  } catch (error) {
    console.error("MONGODB CONNECTION ERROR:", error.message);
    throw error;
  }
};

module.exports = connectDB;
