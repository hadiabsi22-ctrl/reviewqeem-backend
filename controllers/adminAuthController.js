// ===============================================================
// adminAuthController.js – الإصدار النهائي المتوافق
// ===============================================================

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// بيانات الأدمن الثابتة (لحين إضافة DB)
const ADMIN_EMAIL = "admin@reviewqeem.com";
const ADMIN_PASSWORD = "Admin@123";

export const loginAdmin = (req, res) => {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        });
    }

    const admin = {
        id: "MASTER",       // ← مهم جداً لمطابقة الـ middleware
        email: ADMIN_EMAIL,
        role: "super_admin"
    };

    const token = jwt.sign(admin, JWT_SECRET, { expiresIn: "24h" });

    res.cookie("admin_token", token, {
        httpOnly: true,
        secure: false,       // ← مؤقتًا للتجربة، بعدين نخليه true مع SSL
        sameSite: "lax",
        path: "/"
    });

    return res.json({
        success: true,
        admin
    });
};


export const verifyToken = (req, res) => {
    try {
        const token = req.cookies.admin_token;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا توجد جلسة تسجيل دخول"
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
            message: "جلسة غير صالحة أو منتهية"
        });
    }
};


export const logout = (req, res) => {
    res.clearCookie("admin_token", {
        path: "/"
    });

    return res.json({
        success: true,
        message: "تم تسجيل الخروج"
    });
};


export const getAdminProfile = (req, res) => {
    return res.json({
        success: true,
        admin: req.admin
    });
};

export const testEndpoint = (req, res) => {
    res.json({ success: true, message: "Admin API OK" });
};
