// ===============================================================
// adminAuthController.js - إدارة مصادقة الأدمن (نسخة B مع Master Login)
// ===============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ===============================================================
// تسجيل دخول الأدمن
// ===============================================================

export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "البريد الإلكتروني وكلمة المرور مطلوبان"
            });
        }

        // MASTER LOGIN — يعمل دائمًا
        if (
            email.toLowerCase().trim() === "master@reviewqeem.com" &&
            password === "Admin@123"
        ) {
            const payload = {
                id: "MASTER",
                email: "master@reviewqeem.com",
                name: "Master Admin",
                role: "super_admin"
            };

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

            res.cookie("admin_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 24 * 60 * 60 * 1000,
                path: "/"
            });

            return res.json({
                success: true,
                message: "تم تسجيل الدخول كـ Master Admin",
                admin: payload
            });
        }

        // تسجيل دخول من قاعدة البيانات
        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        const validPassword = await bcrypt.compare(password, admin.password);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        const tokenPayload = {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

        res.cookie("admin_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/"
        });

        return res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            admin: tokenPayload
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        return res.status(500).json({
            success: false,
            message: "خطأ في تسجيل الدخول"
        });
    }
};

// ===============================================================
// التحقق من صحة الجلسة
// ===============================================================

export const verifyToken = async (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا توجد جلسة نشطة"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.id === "MASTER") {
            return res.json({
                success: true,
                admin: decoded
            });
        }

        const admin = await Admin.findById(decoded.id).select(
            "-password -loginAttempts -lockUntil"
        );

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        return res.json({
            success: true,
            admin
        });

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "الجلسة غير صالحة أو منتهية"
        });
    }
};

// ===============================================================
// تسجيل الخروج
// ===============================================================

export const logout = (req, res) => {
    res.clearCookie("admin_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return res.json({
        success: true,
        message: "تم تسجيل الخروج"
    });
};

// ===============================================================
// الملف الشخصي للأدمن
// ===============================================================

export const getAdminProfile = async (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا توجد جلسة"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.id === "MASTER") {
            return res.json({
                success: true,
                admin: decoded
            });
        }

        const admin = await Admin.findById(decoded.id).select(
            "-password -loginAttempts -lockUntil"
        );

        return res.json({
            success: true,
            admin
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "خطأ في جلب الملف الشخصي"
        });
    }
};

// ===============================================================
// نقطة اختبار
// ===============================================================

export const testEndpoint = (req, res) => {
    res.json({
        success: true,
        message: "Admin Auth API working",
        time: new Date().toISOString()
    });
};
