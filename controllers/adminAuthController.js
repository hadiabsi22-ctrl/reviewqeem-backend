import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ======================
//  Login Admin
// ======================
export const loginAdmin = (req, res) => {
    const { email, password } = req.body;

    // قائمة الإيميلات المسموح بها
    const ALLOWED_EMAILS = [
        "admin@reviewqeem.com",
        "master@reviewqeem.com",
        "temp@example.com",
        "hadi@reviewqeem.com",
        "test@reviewqeem.com"
    ];

    // كلمة المرور الموحدة
    const CORRECT_PASSWORD = "Admin@123";

    if (ALLOWED_EMAILS.includes(email) && password === CORRECT_PASSWORD) {
        const admin = {
            id: "admin_fixed_001",
            email,
            name: "Super Admin",
            role: "super_admin",
            permissions: ["all"]
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
            message: "✅ تم تسجيل الدخول بنجاح",
            admin
        });
    }

    // بيانات خاطئة
    return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    });
};


// ======================
//  Verify Token
// ======================
export const verifyToken = (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا توجد جلسة دخول"
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
            message: "الجلسة منتهية أو غير صالحة"
        });
    }
};


// ======================
//  Logout Admin
// ======================
export const logout = (req, res) => {
    res.clearCookie("admin_token", {
        path: "/",
        secure: true,
        sameSite: "none"
    });

    return res.json({
        success: true,
        message: "تم تسجيل الخروج بنجاح"
    });
};
