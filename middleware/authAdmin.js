// ===============================================================
// authAdmin.js – إصدار متوافق 100%
// ===============================================================

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

export const authAdmin = (req, res, next) => {
    try {
        const token = req.cookies?.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "يرجى تسجيل الدخول أولاً"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // يجب أن يكون ID = MASTER (مطابق لملف loginAdmin)
        if (decoded.id !== "MASTER") {
            return res.status(403).json({
                success: false,
                message: "توكن غير صالح"
            });
        }

        req.admin = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "جلسة منتهية أو غير صالحة"
        });
    }
};
