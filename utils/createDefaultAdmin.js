// backend/utils/createDefaultAdmin.js
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";

export const createDefaultAdmin = async () => {
  try {
    // التحقق من وجود الأدمن الافتراضي بالبريد المحدد
    console.log("🔍 Checking for existing admin user...");
    const existingAdmin = await Admin.findOne({ email: "temp@example.com" });
    if (existingAdmin) {
      console.log("✅ Default admin already exists");
      return;
    }

    // إنشاء كلمة مرور مشفرة
    const saltRounds = 12;
    const defaultPassword = "TempPass123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // إنشاء الأدمن الافتراضي
    const admin = new Admin({
      email: "temp@example.com",
      password: hashedPassword,
      name: "مدير النظام",
      role: "admin"
    });

    await admin.save();

    console.log("🚀 Default admin created successfully!");
    console.log("📧 Email: temp@example.com");
    console.log("🔑 Password: TempPass123!");
    console.log("⚠️  Please change the password after first login!");

  } catch (error) {
    console.error("❌ Error creating default admin:", error);
  }
};

// تشغيل الدالة إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultAdmin().then(() => process.exit(0));
}
