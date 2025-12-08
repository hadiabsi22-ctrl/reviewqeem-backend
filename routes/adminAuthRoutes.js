// ===============================================================
// adminAuthRoutes.js
// ===============================================================

import express from "express";
import {
    loginAdmin,
    verifyToken,
    logout,
    getAdminProfile,
    testEndpoint
} from "../controllers/adminAuthController.js";

import { authAdmin } from "../middleware/authAdmin.js";

const router = express.Router();

// تسجيل الدخول
router.post("/login", loginAdmin);

// تحقق من التوكن
router.get("/verify", verifyToken);

// تسجيل الخروج
router.post("/logout", logout);

// الملف الشخصي للأدمن
router.get("/profile", authAdmin, getAdminProfile);

// نقطة اختبار
router.get("/test", testEndpoint);

export default router;
