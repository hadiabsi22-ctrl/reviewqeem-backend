// ===============================================================
// adminAuthRoutes.js - مسارات مصادقة الأدمن (نسخة B)
// ===============================================================

import express from "express";
import {
    loginAdmin,
    verifyToken,
    logout,
    getAdminProfile,
    testEndpoint
} from "../controllers/adminAuthController.js";

const router = express.Router();

// تسجيل الدخول
router.post("/login", loginAdmin);

// التحقق من الجلسة
router.get("/auth/verify", verifyToken);

// تسجيل الخروج
router.post("/logout", logout);

// الملف الشخصي
router.get("/profile", verifyToken, getAdminProfile);

// نقطة اختبار
router.get("/test", testEndpoint);

export default router;
