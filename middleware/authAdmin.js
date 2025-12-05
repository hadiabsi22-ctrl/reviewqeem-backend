// ===============================================================
// authAdmin.js - ميدلوير للتحقق من صحة توكن الأدمن
// ===============================================================

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ===============================================================
// Middleware الرئيسي للتحقق من المصادقة
// ===============================================================

export const authAdmin = (req, res, next) => {
    try {
        let token = null;

        // 📍 استراتيجيات استخراج التوكن (بالترتيب):
        
        // 1. من الكوكيز (النظام الجديد - الأفضل)
        if (req.cookies && req.cookies.admin_token) {
            token = req.cookies.admin_token;
            
            if (process.env.NODE_ENV === 'development') {
                // Production: لا نطبع معلومات حساسة في console
            }
        }
        
        // 2. من Authorization header (للتوافق مع النظام القديم)
        else if (req.headers.authorization || req.headers.Authorization) {
            const authHeader = req.headers.authorization || req.headers.Authorization;
            
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7); // إزالة "Bearer "
                
                if (process.env.NODE_ENV === 'development') {
                    console.log('🔐 Token extracted from Authorization header');
                }
            }
        }
        
        // 3. من query parameter (لأغراض التطوير فقط)
        else if (req.query.token && process.env.NODE_ENV === 'development') {
            token = req.query.token;
            console.log('🔐 Token extracted from query parameter (DEV ONLY)');
        }

        // 🔍 إذا لم يتم العثور على توكن
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "الوصول مرفوض. يرجى تسجيل الدخول.",
                code: "NO_TOKEN",
                timestamp: new Date().toISOString()
            });
        }

        // ✅ التحقق من صحة التوكن
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 📝 إضافة معلومات الأدمن إلى request object
        req.admin = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role || "admin",
            iat: decoded.iat,
            exp: decoded.exp
        };
        
        // إضافة التوكن نفسه إذا لزم
        req.token = token;

        // 📊 تسجيل معلومات المصادقة في التطوير
        if (process.env.NODE_ENV === 'development') {
            // Production: لا نطبع معلومات حساسة في console
            // console.log('🔐 Authenticated admin:', {
            //     id: req.admin.id,
            //     email: req.admin.email,
            //     name: req.admin.name,
            //     role: req.admin.role,
            //     expires: new Date(req.admin.exp * 1000).toLocaleString()
            // });
        }

        // ⏭️ المتابعة إلى الـ handler التالي
        next();

    } catch (error) {
        // 🚨 معالجة أخطاء JWT المختلفة
        
        console.error("🔐 Auth Middleware Error:", error.name, error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.",
                code: "TOKEN_EXPIRED",
                timestamp: new Date().toISOString(),
                originalExpiry: error.expiredAt
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "جلسة غير صالحة أو تالفة.",
                code: "INVALID_TOKEN",
                timestamp: new Date().toISOString(),
                details: error.message
            });
        }

        if (error.name === "NotBeforeError") {
            return res.status(401).json({
                success: false,
                message: "الجلسة غير نشطة بعد.",
                code: "TOKEN_NOT_ACTIVE",
                timestamp: new Date().toISOString(),
                activeFrom: error.date
            });
        }

        // لأي خطأ آخر غير متوقع
        return res.status(500).json({
            success: false,
            message: "حدث خطأ غير متوقع في التحقق من الهوية.",
            code: "AUTH_SERVER_ERROR",
            timestamp: new Date().toISOString()
        });
    }
};

// ===============================================================
// Middleware للتحقق من الصلاحيات
// ===============================================================

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // يجب استدعاء authAdmin أولاً
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: "يجب تسجيل الدخول أولاً",
                code: "UNAUTHENTICATED"
            });
        }

        // التحقق من الصلاحيات
        const userRole = req.admin.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "ليس لديك صلاحية للوصول إلى هذا المورد",
                code: "INSUFFICIENT_PERMISSIONS",
                requiredRoles: allowedRoles,
                userRole: userRole
            });
        }

        next();
    };
};

// ===============================================================
// Middleware للتحقق من ملكية المورد
// ===============================================================

export const checkResourceOwnership = (resourceOwnerIdField = "adminId") => {
    return async (req, res, next) => {
        try {
            // إذا كان المورد مملوكاً للأدمن الحالي
            if (req.params[resourceOwnerIdField] === req.admin.id) {
                return next();
            }

            // أو إذا كان الأدمن من النوع super_admin
            if (req.admin.role === "super_admin") {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: "ليس لديك صلاحية للوصول إلى هذا المورد",
                code: "RESOURCE_OWNERSHIP_REQUIRED"
            });

        } catch (error) {
            console.error("Resource ownership check error:", error);
            return res.status(500).json({
                success: false,
                message: "خطأ في التحقق من ملكية المورد"
            });
        }
    };
};

// ===============================================================
// Middleware للتحقق من نشاط الجلسة
// ===============================================================

export const checkSessionActivity = (maxInactiveMinutes = 30) => {
    return (req, res, next) => {
        if (!req.admin || !req.admin.iat) {
            return next();
        }

        const tokenIssuedAt = req.admin.iat * 1000; // تحويل إلى ميلي ثانية
        const now = Date.now();
        const inactiveTime = now - tokenIssuedAt;
        const maxInactiveTime = maxInactiveMinutes * 60 * 1000;

        if (inactiveTime > maxInactiveTime) {
            return res.status(401).json({
                success: false,
                message: "الجلسة غير نشطة لفترة طويلة. يرجى تسجيل الدخول مرة أخرى.",
                code: "SESSION_INACTIVE",
                inactiveMinutes: Math.floor(inactiveTime / 60000),
                maxInactiveMinutes: maxInactiveMinutes
            });
        }

        next();
    };
};