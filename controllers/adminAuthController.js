// ===============================================================
// adminAuthController.js - إدارة مصادقة الأدمن (نسخة الكوكيز)
// ===============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

// ===============================================================
// JWT Secret
// ===============================================================

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ===============================================================
// تهيئة الأدمن الافتراضي
// ===============================================================

export const initializeAdmin = async () => {
    try {
        const count = await Admin.countDocuments();
        if (count > 0) {
            console.log("✅ أدمن موجود بالفعل");
            return;
        }

        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "TempPass123!";
        const hash = await bcrypt.hash(defaultPassword, 12);

        const admin = await Admin.create({
            email: "temp@example.com",
            password: hash,
            name: "مدير النظام",
            role: "super_admin"
        });

        console.log("✅ تم إنشاء الأدمن الافتراضي:");
        console.log(`   🔑 كلمة المرور: ${defaultPassword}`);

    } catch (error) {
        console.error("❌ خطأ في إنشاء الأدمن الافتراضي:", error.message);
    }
};

// ===============================================================
// دوال مساعدة
// ===============================================================

const isLocked = (admin) => {
    return admin.lockUntil && admin.lockUntil > Date.now();
};

const resetLoginAttempts = async (adminId) => {
    await Admin.findByIdAndUpdate(adminId, {
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date()
    });
};

const incrementLoginAttempts = async (adminId) => {
    const admin = await Admin.findById(adminId);
    const attempts = (admin.loginAttempts || 0) + 1;

    let lockUntil = null;
    if (attempts >= 5) {
        lockUntil = Date.now() + (30 * 60 * 1000);
    }

    await Admin.findByIdAndUpdate(adminId, {
        loginAttempts: attempts,
        lockUntil
    });

    return attempts;
};

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

        const admin = await Admin.findOne({
            email: email.toLowerCase().trim()
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        if (isLocked(admin)) {
            const remainingMinutes = Math.ceil((admin.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                message: `الحساب مقفل. حاول بعد ${remainingMinutes} دقيقة`
            });
        }

        const validPassword = await bcrypt.compare(password, admin.password);

        if (!validPassword) {
            const attempts = await incrementLoginAttempts(admin._id);

            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
                attempts
            });
        }

        await resetLoginAttempts(admin._id);

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

        res.json({
            success: true,
            message: "تم تسجيل الدخول",
            admin: tokenPayload
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في السيرفر أثناء تسجيل الدخول"
        });
    }
};

// ===============================================================
// التحقق من صحة التوكن
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
                message: "الجلسة غير صالحة أو انتهت"
            });
        }

        const admin = await Admin.findById(decoded.id)
            .select("-password -loginAttempts -lockUntil");

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

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "خطأ في التحقق من الجلسة"
        });
    }
};

// ===============================================================
// تسجيل الخروج
// ===============================================================

export const logout = async (req, res) => {
    try {
        res.clearCookie("admin_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        res.json({
            success: true,
            message: "تم تسجيل الخروج"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "خطأ أثناء تسجيل الخروج"
        });
    }
};

// ===============================================================
// الحصول على معلومات الأدمن
// ===============================================================

export const getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id)
            .select("-password -loginAttempts -lockUntil");

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
        message: "Admin Auth API is working!",
        timestamp: new Date().toISOString()
    });
};
