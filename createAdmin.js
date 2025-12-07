import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";
import dotenv from "dotenv";

dotenv.config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = "admin@reviewqeem.com";
        const password = "Admin12345"; // يمكنك تغييره لاحقًا

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await Admin.create({
            email,
            password: hashedPassword,
            name: "Super Admin",
            role: "super_admin"
        });

        console.log("✅ Admin created successfully:");
        console.log("Email:", email);
        console.log("Password:", password);

        process.exit();
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

createAdmin();
