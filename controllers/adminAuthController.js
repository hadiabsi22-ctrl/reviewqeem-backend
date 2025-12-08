// ===============================================================
// adminAuthController.js - Authentication Controller
// ===============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "reviewqeem_admin_secret_2025";

// ---------------------------------------------------------------
// LOGIN ADMIN
// ---------------------------------------------------------------
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            });
        }

        const token = jwt.sign(
            {
                id: admin._id,
                email: admin.email,
                role: admin.role
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.cookie("admin_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/"
        });

        return res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            admin
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "خطأ في الخادم"
        });
    }
};

// ---------------------------------------------------------------
// VERIFY TOKEN
// ---------------------------------------------------------------
export const verifyToken = (req, res) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "لا يوجد توكن، يرجى تسجيل الدخول"
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
            message: "جلسة غير صالحة"
        });
    }
};

// ---------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------
export const logout = (req, res) => {
    res.clearCookie("admin_token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/"
    });

    return res.json({
        success: true,
        message: "تم تسجيل الخروج"
    });
};

// ---------------------------------------------------------------
// GET ADMIN PROFILE  (مهم جداً - هذا اللي كان ناقص ويسبب الخطأ)
// ---------------------------------------------------------------
export const getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select("-password");
        return res.json({ success: true, admin });
    } catch (error) {
        return res.status(500).json({ success: false, message: "خطأ في الخادم" });
    }
};

// ---------------------------------------------------------------
// TEST ENDPOINT
// ---------------------------------------------------------------
export const testEndpoint = (req, res) => {
    res.json({ success: true, message: "Test OK" });
};
