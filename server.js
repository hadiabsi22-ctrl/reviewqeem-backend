// ===============================================================
// ReviewQeem – Backend Server (Final Fixed Version)
// ===============================================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// تحميل متغيرات البيئة
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// Routes
import reviewsRoutes from "./routes/reviewsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import commentRoutes from "./routes/commentsRoutes.js";
import commentsAdminRoutes from "./routes/commentsAdminRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import { createDefaultAdmin } from "./utils/createDefaultAdmin.js";

// تحميل متغيرات البيئة
dotenv.config();

// تعيين NODE_ENV إذا لم يكن محدد
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// تعيين JWT_SECRET إذا لم يكن محدد
process.env.JWT_SECRET = process.env.JWT_SECRET || 'reviewqeem_admin_secret_2025_secure_key';

const app = express();
const PORT = process.env.PORT || 5000;

// Fix dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================================================
// 🔐 Security Middlewares
// ===============================================================
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CSP Fix - Allow all required CDNs and resources
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
      "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: http: https:; " +
      "connect-src 'self' http://localhost:5000 https:; " +
      "media-src 'self' blob:; " +
      "frame-src 'self';"
  );
  next();
});

// ===============================================================
// 🔐 CORS Configuration
// ===============================================================
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ===============================================================
// Parsers
// ===============================================================
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ===============================================================
// Rate Limiting
// ===============================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

// Stricter rate limiting for comments
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 comments per 15 minutes
  message: "تم تجاوز الحد الأقصى لعدد التعليقات. يرجى المحاولة لاحقاً.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: "تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة لاحقاً.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ===============================================================
// Static Frontend Files
// ===============================================================

// Serve main website (root files) with cache control
app.use("/", express.static(path.join(__dirname, "../frontend"), {
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, path) => {
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for CSS/JS
    } else if (path.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week for images
    }
  }
}));

// Serve uploads with cache control
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '7d', // Cache uploads for 7 days
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
  }
}));

// Serve admin files directly (admin.html, admin-login.html, etc.)
// These files are in /frontend, not /frontend/admin
app.get("/admin.html", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

app.get("/admin-login.html", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, "../frontend/admin-login.html"));
});

app.get("/comments-admin.html", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, "../frontend/comments-admin.html"));
});

app.get("/review-management.html", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, "../frontend/review-management.html"));
});

// ===============================================================
// API ROUTES
// ===============================================================
app.use("/api/reviews", apiLimiter, reviewsRoutes);
app.use("/api/comments", commentLimiter, commentRoutes); // Stricter limit for comments
app.use("/api/comments-admin", apiLimiter, commentsAdminRoutes);
app.use("/api/upload", apiLimiter, uploadRoutes);
app.use("/api/admin/auth/login", loginLimiter); // Stricter limit for login
app.use("/api/admin/auth", apiLimiter, adminAuthRoutes);
app.use("/api/settings", apiLimiter, settingsRoutes);
app.use("/api/stats", apiLimiter, statsRoutes);

// ===============================================================
// Remove WRONG catch-all route
// (this was redirecting everything إلى index.html بالغلط)
// ===============================================================
// ❌ ممنوع استخدام هذا:
// app.get("*", ... );

// ===============================================================
// MongoDB Connection
// ===============================================================
const connectDB = async () => {
  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    console.log("MONGO_URI from env:", process.env.MONGO_URI);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  }
};

// ===============================================================
// Start Server
// ===============================================================
const startServer = async () => {
  await connectDB();

  // إنشاء الأدمن الافتراضي إذا لم يكن موجوداً
  await createDefaultAdmin();

  app.listen(PORT, '0.0.0.0', () => {
    console.log("============================================================");
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`🌐 External access: http://84.247.170.23:${PORT}`);
    console.log("============================================================");
    console.log("📂 Frontend:", `http://localhost:${PORT}/`);
    console.log("🔐 Admin Panel:", `http://localhost:${PORT}/admin/login.html`);
    console.log("💬 Comments API Ready");
    console.log("============================================================");
    console.log("🔐 Default Admin: temp@example.com / TempPass123!");
    console.log("⚠️  Change password after first login!");
    console.log("============================================================");
  });
};

startServer();
