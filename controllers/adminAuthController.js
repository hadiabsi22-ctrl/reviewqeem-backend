// ===============================================================
// adminAuthController.js - نسخة نهائية قوية + Master Bypass
// ===============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ===============================================================
// 🔥 Master Bypass Account (دخول طوارئ مضمون دائماً)
// ===============================================================

const MASTER_EMAIL = "master@reviewqeem.com";
const MASTER_PASSWORD = "Admin@123";

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000
};

// ===============================================================
// تسجيل الدخول
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
        // 🔥 MASTER BYPASS LOGIN (Guaranteed access)
        // ===============================================================
        if (email === MASTER_EMAIL && password === MASTER_PASSWORD) {
            const masterPayload = {
                id: "MASTER",
                email: MASTER_EMAIL,
                name: "Master Admin",
                role: "super_admin"
            };

            const token = generateToken(masterPayload);
            res.cookie("admin_token", token, cookieConfig);

            return res.json({
                success: true,
                message: "تم تسجيل الدخول (Master Admin)",
                admin: masterPayload
            });
        }
        // ===============================================================

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        // التحقق من كلمة المرور
        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        const payload = {
            id: admin._id.toString(),
            email: admin.email,
            name: admin.name,
            role: admin.role
        };

        const token = generateToken(payload);
        res.cookie("admin_token", token, cookieConfig);

        return res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            admin: payload
        });

    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ في الخادم"
        });
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
                message: "لا توجد جلسة نشطة"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "الجلسة غير صالحة أو انتهت صلاحيتها"
            });
        }

        // ===============================================================
        // MASTER SESSION VALIDATION
        // ===============================================================
        if (decoded.id === "MASTER") {
            return res.json({
                success: true,
                admin: decoded,
                message: "جلسة الماستر صالحة"
            });
        }
        // ===============================================================

        const admin = await Admin.findById(decoded.id).select("-password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        res.json({
            success: true,
            admin,
            message: "الجلسة صالحة"
        });

    } catch (error) {
        console.error("❌ Verify Error:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ في التحقق من الجلسة"
        });
    }
};

// ===============================================================
// تسجيل الخروج
// ===============================================================

export const logout = (req, res) => {
    try {
        res.clearCookie("admin_token", cookieConfig);
        res.json({
            success: true,
            message: "تم تسجيل الخروج"
        });
    } catch (error) {
        console.error("❌ Logout Error:", error);
        res.status(500).json({
            success: false,
            message: "فشل تسجيل الخروج"
        });
    }
};

// ===============================================================
// جلب بيانات الحساب
// ===============================================================

export const getAdminProfile = async (req, res) => {
    try {
        if (req.admin?.id === "MASTER") {
            return res.json({
                success: true,
                admin: {
                    id: "MASTER",
                    email: MASTER_EMAIL,
                    name: "Master Admin",
                    role: "super_admin"
                }
            });
        }

        const admin = await Admin.findById(req.admin.id).select("-password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        res.json({ success: true, admin });

    } catch (error) {
        console.error("❌ Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب البيانات"
        });
    }
};

// ===============================================================
// نقطة اختبار
// ===============================================================

export const testEndpoint = (req, res) => {
    res.json({
        success: true,
        message: "Admin Auth API running",
        time: new Date().toISOString()
    });
};
