// ===============================================================
// adminAuthRoutes.js - مسارات مصادقة الأدمن (نسخة متوافقة 100% مع النسخة B)
// ===============================================================

import express from "express";
import { 
    loginAdmin, 
    verifyToken, 
    logout,
    getAdminProfile,
    testEndpoint 
} from "../controllers/adminAuthController.js";

import { 
    authAdmin, 
    requireRole, 
    checkSessionActivity 
} from "../middleware/authAdmin.js";

const router = express.Router();

// ===============================================================
// 📍 مسارات عامة (لا تحتاج مصادقة)
// ===============================================================

// 🔍 نقطة اختبار
router.get("/test", testEndpoint);

// 🔐 تسجيل الدخول
router.post("/login", loginAdmin);

// ===============================================================
// 🔒 مسارات محمية (تتطلب مصادقة)
// ===============================================================

// التحقق من صلاحية الجلسة
router.get("/verify", verifyToken);

// تسجيل الخروج
router.post("/logout", authAdmin, logout);

// معلومات الحساب الشخصي
router.get("/profile", authAdmin, getAdminProfile);

// ===============================================================
// 📊 مسارات إحصائية (للمشرفين فقط)
// ===============================================================

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
// 🛡️ مسارات إدارية (super_admin فقط)
// ===============================================================

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
// 🔄 تجديد الجلسة
// ===============================================================

router.post(
    "/refresh-session",
    authAdmin,
    checkSessionActivity(10),
    async (req, res) => {
        try {
            const Admin = (await import("../models/Admin.js")).default;

            // دعم MASTER
            if (req.admin.id === "MASTER") {
                const jwt = require("jsonwebtoken");

                const newToken = jwt.sign(
                    {
                        id: "MASTER",
                        email: "master@reviewqeem.com",
                        name: "Master Admin",
                        role: "super_admin"
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: "24h" }
                );

                res.cookie("admin_token", newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 24 * 60 * 60 * 1000,
                    path: "/"
                });

                return res.json({
                    success: true,
                    message: "تم تجديد الجلسة بنجاح (MASTER)",
                    admin: req.admin
                });
            }

            // تجديد جلسة أدمن عادي
            const admin = await Admin.findById(req.admin.id);

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: "الحساب غير موجود"
                });
            }

            const jwt = require("jsonwebtoken");

            const newToken = jwt.sign(
                {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role
                },
                process.env.JWT_SECRET,
                { expiresIn: "24h" }
            );

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
