// backend/config/database.js
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "reviewqeem",
    });

    console.log("✅ MongoDB connected successfully ✔️");
  } catch (err) {
    console.error("❌ MongoDB connection FAILED (details hidden)");
    console.error("⚠️ Error:", err.message.split(":")[0]); // إخفاء التفاصيل الحساسة
    process.exit(1);
  }
};
