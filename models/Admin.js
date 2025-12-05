import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "مدير النظام" },
  role: { type: String, default: "admin" },
  lastLogin: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
