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
        // Production: لا نطبع معلومات حساسة في console
        console.log(`   🔑 كلمة المرور: ${defaultPassword}`);
        // Production: لا نطبع معلومات حساسة في console

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
        lockUntil = Date.now() + (30 * 60 * 1000); // قفل لمدة 30 دقيقة
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

        // التحقق من المدخلات
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "البريد الإلكتروني وكلمة المرور مطلوبان" 
            });
        }

        // البحث عن الأدمن
        const admin = await Admin.findOne({ 
            email: email.toLowerCase().trim() 
        });
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" 
            });
        }

        // التحقق من حالة القفل
        if (isLocked(admin)) {
            const remainingMinutes = Math.ceil((admin.lockUntil - Date.now()) / 60000);
            return res.status(423).json({ 
                success: false, 
                message: `الحساب مقفل مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة` 
            });
        }

        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, admin.password);
        
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        // إنشاء توكن JWT
        const tokenPayload = {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role
        };

        const token = jwt.sign(
            tokenPayload,
            JWT_SECRET,
            { expiresIn: "24h" } // صلاحية 24 ساعة
        );

        // 🔐 تعيين التوكن في الكوكيز
        const cookieOptions = {
            httpOnly: true,                    // آمن من JavaScript
            secure: process.env.NODE_ENV === "production", // HTTPS فقط في الإنتاج
            sameSite: "lax",                   // متوافق مع معظم المتصفحات
            maxAge: 24 * 60 * 60 * 1000,       // 24 ساعة
            path: "/"                          // متاح لكل المسارات
        };

        res.cookie("admin_token", token, cookieOptions);

        // الرد الناجح (بدون إرسال التوكن في الـ body)
        res.json({ 
            success: true, 
            message: "تم تسجيل الدخول بنجاح",
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                lastLogin: admin.lastLogin
            }
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
// التحقق من صحة التوكن
// ===============================================================

export const verifyToken = async (req, res) => {
    try {
        // التحقق من وجود التوكن في الكوكيز
        const token = req.cookies.admin_token;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا توجد جلسة نشطة"
            });
        }

        // التحقق من صحة التوكن
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "الجلسة غير صالحة أو انتهت صلاحيتها"
            });
        }

        // البحث عن الأدمن في قاعدة البيانات
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
            message: "الجلسة نشطة وصالحة",
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt
            }
        });

    } catch (error) {
        console.error("❌ خطأ في التحقق من التوكن:", error);
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
        // مسح الكوكيز من المتصفح
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        };

        res.clearCookie("admin_token", cookieOptions);

        res.json({ 
            success: true, 
            message: "تم تسجيل الخروج بنجاح" 
        });

    } catch (error) {
        console.error("❌ خطأ في تسجيل الخروج:", error);
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
        console.error("❌ خطأ في جلب معلومات الأدمن:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ في جلب المعلومات" 
        });
    }
};

// ===============================================================
// تغيير كلمة المرور
// ===============================================================

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // التحقق من المدخلات
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: "كلمة المرور الحالية والجديدة مطلوبتان" 
            });
        }

        // التحقق من طول كلمة المرور الجديدة
        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" 
            });
        }

        const admin = await Admin.findById(req.admin.id);
        
        if (!admin) {
            return res.status(404).json({ 
                success: false, 
                message: "الحساب غير موجود" 
            });
        }

        // التحقق من كلمة المرور الحالية
        const validPassword = await bcrypt.compare(currentPassword, admin.password);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: "كلمة المرور الحالية غير صحيحة" 
            });
        }

        // تحديث كلمة المرور
        admin.password = await bcrypt.hash(newPassword, 12);
        admin.updatedAt = new Date();
        await admin.save();

        res.json({ 
            success: true, 
            message: "تم تغيير كلمة المرور بنجاح" 
        });

    } catch (error) {
        console.error("❌ خطأ في تغيير كلمة المرور:", error);
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
// تهيئة الأدمن تتم في server.js فقط
// ===============================================================
// initializeAdmin(); // تم تعطيل هذا لتجنب التضارب