// ===============================================================
// adminAuthRoutes.js - مسارات مصادقة الأدمن
// ===============================================================

import express from "express";
import { 
    loginAdmin, 
    verifyToken, 
    logout,
    getAdminProfile,
    changePassword,
    testEndpoint 
} from "../controllers/adminAuthController.js";
import { authAdmin, requireRole, checkSessionActivity } from "../middleware/authAdmin.js";

const router = express.Router();

// ===============================================================
// 📍 مسارات عامة (لا تحتاج مصادقة)
// ===============================================================

// 🔍 نقطة اختبار
router.get("/test", testEndpoint);

// 🔐 تسجيل الدخول (rate limiting applied in server.js)
router.post("/login", loginAdmin);

// ===============================================================
// 🔒 مسارات محمية (تتطلب مصادقة)
// ===============================================================

// ✅ التحقق من صحة الجلسة
router.get("/verify", verifyToken);

// تغيير كلمة المرور
router.post("/change-password", changePassword);

// 🚪 تسجيل الخروج
router.post("/logout", authAdmin, logout);

// 👤 الحصول على معلومات الملف الشخصي
router.get("/profile", authAdmin, getAdminProfile);

// 🔑 تغيير كلمة المرور
router.post("/change-password", authAdmin, changePassword);

// ===============================================================
// 📊 مسارات إحصائية (للمشرفين فقط)
// ===============================================================

// 📈 إحصائيات الجلسات (للمشرفين فقط)
router.get("/session-stats", 
    authAdmin, 
    requireRole("super_admin", "admin"), 
    async (req, res) => {
        try {
            res.json({
                success: true,
                stats: {
                    authenticated: true,
                    admin: req.admin,
                    sessionDuration: req.admin.exp - req.admin.iat,
                    issuedAt: new Date(req.admin.iat * 1000).toISOString(),
                    expiresAt: new Date(req.admin.exp * 1000).toISOString(),
                    remainingTime: Math.floor((req.admin.exp * 1000 - Date.now()) / 1000)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "خطأ في جلب إحصائيات الجلسة"
            });
        }
    }
);

// ===============================================================
// 🛡️ مسارات إدارية (للمشرفين الرئيسيين فقط)
// ===============================================================

// 👥 قائمة جميع الأدمن (للمشرفين الرئيسيين فقط)
router.get("/all", 
    authAdmin, 
    requireRole("super_admin"), 
    async (req, res) => {
        try {
            const Admin = (await import("../models/Admin.js")).default;
            const admins = await Admin.find({})
                .select("-password -loginAttempts -lockUntil")
                .sort({ createdAt: -1 });
            
            res.json({
                success: true,
                count: admins.length,
                admins
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "خطأ في جلب قائمة الأدمن"
            });
        }
    }
);

// ===============================================================
// 🩺 مسارات فحص الصحة
// ===============================================================

// 🔍 فحص صحة المصادقة
router.get("/health", authAdmin, (req, res) => {
    res.json({
        success: true,
        message: "نظام المصادقة يعمل بشكل صحيح",
        status: {
            authentication: "active",
            cookieSupport: true,
            sessionValid: true,
            admin: {
                id: req.admin.id,
                email: req.admin.email,
                name: req.admin.name,
                role: req.admin.role
            }
        },
        server: {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        }
    });
});

// ===============================================================
// 🆘 مسارات استكشاف الأخطاء وإصلاحها
// ===============================================================

// 🐛 فحص التوكن (للتطوير فقط)
if (process.env.NODE_ENV === 'development') {
    router.post("/debug-token", (req, res) => {
        try {
            const { token } = req.body;
            
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: "يجب توفير التوكن"
                });
            }
            
            const jwt = require("jsonwebtoken");
            const JWT_SECRET = process.env.JWT_SECRET;
            
            const decoded = jwt.verify(token, JWT_SECRET);
            
            res.json({
                success: true,
                decoded,
                expiry: new Date(decoded.exp * 1000).toLocaleString(),
                issued: new Date(decoded.iat * 1000).toLocaleString(),
                valid: decoded.exp * 1000 > Date.now()
            });
            
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.name,
                message: error.message
            });
        }
    });
}

// ===============================================================
// 🔄 مسار إعادة تعيين الجلسة
// ===============================================================

router.post("/refresh-session", 
    authAdmin, 
    checkSessionActivity(10), // فقط إذا كانت الجلسة نشطة في آخر 10 دقائق
    async (req, res) => {
        try {
            const Admin = (await import("../models/Admin.js")).default;
            const admin = await Admin.findById(req.admin.id);
            
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: "الحساب غير موجود"
                });
            }
            
            // إنشاء توكن جديد
            const jwt = require("jsonwebtoken");
            const JWT_SECRET = process.env.JWT_SECRET;
            
            const newToken = jwt.sign(
                {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role
                },
                JWT_SECRET,
                { expiresIn: "24h" }
            );
            
            // تعيين التوكن الجديد في الكوكيز
            res.cookie("admin_token", newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 24 * 60 * 60 * 1000,
                path: "/"
            });
            
            res.json({
                success: true,
                message: "تم تجديد الجلسة بنجاح",
                admin: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role
                }
            });
            
        } catch (error) {
            console.error("Session refresh error:", error);
            res.status(500).json({
                success: false,
                message: "خطأ في تجديد الجلسة"
            });
        }
    }
);

export default router;