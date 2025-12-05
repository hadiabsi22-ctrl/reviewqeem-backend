// ==============================
// ReviewQeem - Admin Auth Middleware
// ==============================

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        // 1. الحصول على الهيدر
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "لم يتم توفير التوكن"
            });
        }

        // 2. استخراج التوكن
        const token = authHeader.split(" ")[1];

        // 3. فك التوكن والتحقق منه
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "توكن غير صالح"
            });
        }

        // 4. التحقق من أن الدور Admin
        if (decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "ليس لديك صلاحية للوصول"
            });
        }

        // 5. حفظ بيانات المستخدم داخل req
        req.user = decoded;

        next();

    } catch (error) {
        console.error("❌ Auth Error:", error.message);

        return res.status(401).json({
            success: false,
            message: "انتهت صلاحية التوكن أو غير صالح"
        });
    }
};
