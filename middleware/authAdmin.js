// ===============================================================
// authAdmin.js - Middleware للتحقق من صلاحية الأدمن
// ===============================================================

import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

export const authAdmin = (req, res, next) => {
    try {
        let token = req.cookies?.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا يوجد توكن. يرجى تسجيل الدخول."
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.id === "MASTER") {
            req.admin = decoded;
            return next();
        }

        req.admin = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "جلسة غير صالحة أو منتهية"
        });
    }
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: "ليس لديك صلاحية الوصول"
            });
        }
        next();
    };
};
