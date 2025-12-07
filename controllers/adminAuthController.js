// ===============================================================
// Admin Auth Controller - Stable Version
// ===============================================================

import jwt from "jsonwebtoken";

// نستخدم مفتاح ثابت
const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// -----------------------------------------------------------
// تسجيل الدخول
// -----------------------------------------------------------
export const loginAdmin = (req, res) => {
    const { email, password } = req.body;

    // ⚠️ نسخة اختبار: أي بريد + أي كلمة مرور = تسجيل دخول ناجح
    const admin = {
        id: "TEST_ADMIN_01",
        email: email || "test@reviewqeem.com",
        name: "Test Admin",
        role: "super_admin"
    };

    const token = jwt.sign(admin, JWT_SECRET, { expiresIn: "24h" });

    res.cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
        success: true,
        message: "Login Success (TEST MODE)",
        admin
    });
};

// -----------------------------------------------------------
// التحقق من الجلسة
// -----------------------------------------------------------
export const verifyToken = (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No active session"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        return res.json({
            success: true,
            admin: decoded
        });

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session"
        });
    }
};

// -----------------------------------------------------------
// تسجيل الخروج
// -----------------------------------------------------------
export const logout = (req, res) => {
    res.clearCookie("admin_token", {
        path: "/",
        secure: true,
        sameSite: "none",
    });

    return res.json({
        success: true,
        message: "Logged out"
    });
};

// -----------------------------------------------------------
// إرجاع بيانات الملف الشخصي
// -----------------------------------------------------------
export const getAdminProfile = (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No active session"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        return res.json({
            success: true,
            admin: decoded
        });

    } catch {
        return res.status(401).json({
            success: false,
            message: "Session invalid"
        });
    }
};

// -----------------------------------------------------------
// نقطة اختبار
// -----------------------------------------------------------
export const testEndpoint = (req, res) => {
    res.json({
        success: true,
        message: "Admin Auth API Running",
        time: new Date().toISOString()
    });
};
