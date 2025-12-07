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

        // ===========================================================
        // 🚀 MASTER ADMIN LOGIN
        // ===========================================================
        if (email === "master@reviewqeem.com" && password === "Admin@123") {
            const tokenPayload = {
                id: "MASTER",
                email: "master@reviewqeem.com",
                name: "Master Admin",
                role: "super_admin"
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
                message: "تم تسجيل الدخول (Master Admin)",
                user: tokenPayload
            });
        }

        // ===========================================================
        // البحث عن الأدمن الحقيقي (من قاعدة البيانات)
        // ===========================================================

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

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
                message: `الحساب مقفل مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة`
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

        res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            user: tokenPayload
        });

    } catch (error) {
        console.error("❌ خطأ في تسجيل الدخول:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ في الخادم. يرجى المحاولة لاحقاً."
        });
    }
};

// ===============================================================
// التحقق من صحة التوكن (مهم جدًا للواجهة)
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
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "الجلسة غير صالحة أو انتهت صلاحيتها"
            });
        }

        // ===================== MASTER ADMIN =======================
        if (decoded.id === "MASTER") {
            return res.json({
                success: true,
                message: "الجلسة نشطة وصالحة",
                user: decoded
            });
        }

        // ===================== DATABASE ADMIN =====================
        const admin = await Admin.findById(decoded.id)
            .select("-password -loginAttempts -lockUntil");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        return res.json({
            success: true,
            message: "الجلسة نشطة وصالحة",
            user: admin
        });

    } catch (error) {
        console.error("❌ خطأ في التحقق من الجلسة:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ في التحقق من الجلسة"
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
            message: "تم تسجيل الخروج بنجاح"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "حدث خطأ في تسجيل الخروج"
        });
    }
};

// ===============================================================
// الحصول على معلومات الأدمن
// ===============================================================

export const getAdminProfile = async (req, res) => {
    try {
        if (req.admin?.id === "MASTER") {
            return res.json({
                success: true,
                user: {
                    id: "MASTER",
                    email: "master@reviewqeem.com",
                    name: "Master Admin",
                    role: "super_admin"
                }
            });
        }

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
            user: admin
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "خطأ في جلب المعلومات"
        });
    }
};

// ===============================================================
// تعديل كلمة المرور
// ===============================================================

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (req.admin?.id === "MASTER") {
            return res.status(403).json({
                success: false,
                message: "لا يمكن تغيير كلمة مرور الماستر"
            });
        }

        const admin = await Admin.findById(req.admin.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        const validPassword = await bcrypt.compare(currentPassword, admin.password);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "كلمة المرور الحالية غير صحيحة"
            });
        }

        admin.password = await bcrypt.hash(newPassword, 12);
        admin.updatedAt = new Date();
        await admin.save();

        res.json({
            success: true,
            message: "تم تغيير كلمة المرور بنجاح"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "حدث خطأ في تغيير كلمة المرور"
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
        version: "3.0",
        authentication: "Cookie-based JWT",
        timestamp: new Date().toISOString()
    });
};

// ===============================================================
// نهاية الملف
// ===============================================================

