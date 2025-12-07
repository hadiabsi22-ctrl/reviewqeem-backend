// ===============================================================
// adminAuthController.js - إدارة مصادقة الأدمن (نسخة Render النهائية)
// ===============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ===============================================================
// Cookie Settings (متوافقة 100% مع Render)
// ===============================================================
const cookieOptions = {
    httpOnly: true,
    secure: true,        // Render requires HTTPS
    sameSite: "none",    // MUST be "none" for cross-domain cookies
    maxAge: 24 * 60 * 60 * 1000,
    path: "/"
};

// ===============================================================
// Master Admin (للإنقاذ دائماً)
// ===============================================================
const MASTER_EMAIL = "master@reviewqeem.com";
const MASTER_PASSWORD = "Admin@123";

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

        // ===============================================================
        // Master Login - Always Works مهما صار
        // ===============================================================
        if (email === MASTER_EMAIL && password === MASTER_PASSWORD) {
            const payload = {
                id: "MASTER",
                email: MASTER_EMAIL,
                name: "Master Admin",
                role: "super_admin"
            };

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

            res.cookie("admin_token", token, cookieOptions);

            return res.json({
                success: true,
                message: "تم تسجيل الدخول (Master Admin)",
                admin: payload
            });
        }

        // ===============================================================
        // تسجيل دخول الأدمن من قاعدة البيانات
        // ===============================================================

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

        const payload = {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

        res.cookie("admin_token", token, cookieOptions);

        res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            admin: payload
        });

    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ success: false, message: "خطأ في الخادم" });
    }
};

// ===============================================================
// التحقق من الجلسة
// ===============================================================

export const verifyToken = async (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا توجد جلسة"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Master Admin
        if (decoded.id === "MASTER") {
            return res.json({
                success: true,
                admin: decoded
            });
        }

        const admin = await Admin.findById(decoded.id).select("-password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        res.json({
            success: true,
            admin
        });

    } catch (error) {
        console.error("❌ Verify Error:", error);
        res.status(401).json({
            success: false,
            message: "الجلسة غير صالحة"
        });
    }
};

// ===============================================================
// تسجيل الخروج
// ===============================================================

export const logout = (req, res) => {
    try {
        res.clearCookie("admin_token", cookieOptions);

        res.json({
            success: true,
            message: "تم تسجيل الخروج"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "فشل تسجيل الخروج"
        });
    }
};

// ===============================================================
// الملف الشخصي للأدمن
// ===============================================================

export const getAdminProfile = async (req, res) => {
    try {
        const token = req.cookies.admin_token;

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.id === "MASTER") {
            return res.json({
                success: true,
                admin: decoded
            });
        }

        const admin = await Admin.findById(decoded.id).select("-password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        res.json({
            success: true,
            admin
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "خطأ في جلب المعلومات"
        });
    }
};

// ===============================================================
// نقطة اختبار
// ===============================================================

export const testEndpoint = (req, res) => {
    res.json({
        success: true,
        message: "Admin Auth OK",
        timestamp: new Date().toISOString()
    });
};
