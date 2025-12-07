// ===============================================================
// Admin Auth Controller - Instant Login (NO PASSWORD REQUIRED)
// ⚠️ للاختبار فقط — لا تستخدم للإنتاج
// ===============================================================

import jwt from "jsonwebtoken";

const JWT_SECRET = "INSTANT_TEST_MODE_2025";

// ------------------ LOGIN (Always Success) ------------------
export const loginAdmin = (req, res) => {
    const { email } = req.body;

    // أي بريد يدخل، بدون كلمة مرور
    const payload = {
        id: "TEST_ADMIN",
        email: email || "test@instant-login.com",
        role: "super_admin"
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    res.cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
    });

    return res.json({
        success: true,
        message: "Instant Login Enabled",
        admin: payload
    });
};

// ------------------ VERIFY SESSION ------------------
export const verifyToken = (req, res) => {
    try {
        const token = req.cookies.admin_token;
        const decoded = jwt.verify(token, JWT_SECRET);

        return res.json({
            success: true,
            admin: decoded
        });
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: "Session invalid"
        });
    }
};

// ------------------ LOGOUT ------------------
export const logout = (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
};
