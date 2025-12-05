// ===============================================================
// uploadRoutes.js — نظام رفع الصور المحلي الكامل
// ===============================================================

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authAdmin } from "../middleware/authAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ==================== تكوين multer ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/images');
    
    // إنشاء المجلد إذا لم يكن موجوداً
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  
  filename: (req, file, cb) => {
    // اسم فريد: timestamp + random + extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `game_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
    cb(null, fileName);
  }
});

// أنواع الملفات المسموحة
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح. يُسمح فقط بملفات الصور (JPEG, PNG, GIF, WebP)'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB كحد أقصى
    files: 10 // 10 ملفات كحد أقصى في المرة الواحدة
  },
  fileFilter: fileFilter
});

// ==================== Middleware لمعالجة الأخطاء ====================
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: "حجم الملف كبير جداً. الحد الأقصى 10MB"
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: "تم تجاوز الحد الأقصى لعدد الملفات"
      });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "حدث خطأ أثناء رفع الملف"
    });
  }
  next();
};

// ==================== ROUTES ====================

/**
 * ✅ رفع صورة واحدة
 * POST /api/upload/single
 */
router.post("/single", authAdmin, upload.single('image'), handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "لم يتم رفع أي ملف. يرجى اختيار صورة أولاً."
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
    
    console.log(`✅ تم رفع صورة: ${req.file.filename}`);
    
    res.json({
      success: true,
      message: "✅ تم رفع الصورة بنجاح",
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: imageUrl,
        url: imageUrl, // للتوافق
        fullUrl: fullUrl,
        thumbnailUrl: imageUrl // يمكن إضافة thumbnail لاحقاً
      }
    });
    
  } catch (error) {
    console.error("❌ خطأ في رفع الصورة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ غير متوقع أثناء رفع الصورة",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ✅ رفع عدة صور
 * POST /api/upload/multiple
 */
router.post("/multiple", authAdmin, upload.array('images', 10), handleUploadError, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "لم يتم رفع أي ملفات. يرجى اختيار الصور أولاً."
      });
    }

    const imagesData = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: `/uploads/images/${file.filename}`,
      url: `/uploads/images/${file.filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}/uploads/images/${file.filename}`
    }));
    
    console.log(`✅ تم رفع ${req.files.length} صورة`);
    
    res.json({
      success: true,
      message: `✅ تم رفع ${req.files.length} صورة بنجاح`,
      count: req.files.length,
      data: imagesData
    });
    
  } catch (error) {
    console.error("❌ خطأ في رفع الصور:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ غير متوقع أثناء رفع الصور",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ✅ رفع صورة للعبة معينة
 * POST /api/upload/game/:gameId
 */
router.post("/game/:gameId", authAdmin, upload.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "لم يتم رفع أي ملف"
      });
    }

    const gameId = req.params.gameId;
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    // حفظ رابط الصورة مع المراجعة في قاعدة البيانات
    const Review = (await import("../models/Review.js")).default;
    await Review.findByIdAndUpdate(gameId, {
      $push: { screenshots: imageUrl }
    });
    
    console.log(`✅ تم رفع صورة للمراجعة ${gameId}: ${req.file.filename}`);
    
    res.json({
      success: true,
      message: "✅ تم رفع الصورة وحفظها مع المراجعة",
      data: {
        filename: req.file.filename,
        path: imageUrl,
        url: imageUrl,
        gameId: gameId
      }
    });
    
  } catch (error) {
    console.error("❌ خطأ في رفع صورة اللعبة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء رفع الصورة للمراجعة",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ✅ حذف صورة
 * DELETE /api/upload/:filename
 */
router.delete("/:filename", authAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/images', filename);
    
    // منع حذف الصور الافتراضية
    if (filename.includes('default-')) {
      return res.status(403).json({
        success: false,
        message: "غير مسموح بحذف الصور الافتراضية"
      });
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ تم حذف الصورة: ${filename}`);
      
      res.json({
        success: true,
        message: "✅ تم حذف الصورة بنجاح",
        filename: filename
      });
    } else {
      res.status(404).json({
        success: false,
        message: "❌ الصورة غير موجودة"
      });
    }
    
  } catch (error) {
    console.error("❌ خطأ في حذف الصورة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الصورة",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ✅ قائمة الصور المرفوعة
 * GET /api/upload/list
 */
router.get("/list", authAdmin, (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, '../uploads/images');
    
    if (!fs.existsSync(uploadsPath)) {
      return res.json({
        success: true,
        count: 0,
        images: []
      });
    }
    
    const files = fs.readdirSync(uploadsPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        filename: file,
        path: `/uploads/images/${file}`,
        url: `/uploads/images/${file}`,
        fullUrl: `${req.protocol}://${req.get('host')}/uploads/images/${file}`,
        size: fs.statSync(path.join(uploadsPath, file)).size,
        modified: fs.statSync(path.join(uploadsPath, file)).mtime
      }));
    
    res.json({
      success: true,
      count: files.length,
      images: files
    });
    
  } catch (error) {
    console.error("❌ خطأ في جلب قائمة الصور:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب قائمة الصور"
    });
  }
});

/**
 * ✅ اختبار رفع الملفات
 * POST /api/upload/test
 */
router.post("/test", upload.single('testImage'), handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "يرجى رفع صورة للاختبار"
      });
    }
    
    // حذف الصورة بعد الاختبار
    const filePath = path.join(__dirname, '../uploads/images', req.file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      success: true,
      message: "✅ نظام رفع الملفات يعمل بشكل صحيح",
      test: {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        fieldname: req.file.fieldname
      }
    });
    
  } catch (error) {
    console.error("❌ خطأ في اختبار الرفع:", error);
    res.status(500).json({
      success: false,
      message: "اختبار رفع الملفات فشل",
      error: error.message
    });
  }
});

export default router;