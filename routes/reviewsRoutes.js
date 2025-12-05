// routes/reviewsRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getPublishedReviews,
  updateReviewStatus
} from "../controllers/reviewsController.js";

import { authAdmin } from "../middleware/authAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ==================== تكوين multer لرفع الصور ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/images');
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `review_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
    cb(null, fileName);
  }
});

const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح. يُسمح فقط بملفات الصور'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: fileFilter
});

// Middleware لمعالجة أخطاء الرفع
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

// ==================== 🔹 المسارات العامة ====================

// جلب كل المراجعات
router.get("/", getAllReviews);

// جلب المراجعات المنشورة (للقائمة الرئيسية)
router.get("/published", getPublishedReviews);

// جلب مراجعة واحدة
router.get("/:id", getReviewById);

// ==================== 🔹 المسارات المحمية (لوحة التحكم) ====================

// إنشاء مراجعة جديدة مع رفع صور
router.post("/", authAdmin, upload.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'screenshots', maxCount: 10 }
]), handleUploadError, async (req, res) => {
  try {
    // معالجة الصور المرفوعة
    const processedData = { ...req.body };
    
    // معالجة صورة الغلاف
    if (req.files?.cover_image?.[0]) {
      const coverFile = req.files.cover_image[0];
      processedData.cover_image = `/uploads/images/${coverFile.filename}`;
    }
    
    // معالجة لقطات الشاشة
    if (req.files?.screenshots) {
      processedData.screenshots = req.files.screenshots.map(file => 
        `/uploads/images/${file.filename}`
      );
    }
    
    // تمرير البيانات للمتحكم
    req.body = processedData;
    await createReview(req, res);
    
  } catch (error) {
    console.error("❌ خطأ في معالجة رفع الصور:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء معالجة الصور"
    });
  }
});

// تحديث مراجعة مع رفع صور جديدة
router.put("/:id", authAdmin, upload.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'screenshots', maxCount: 10 }
]), handleUploadError, async (req, res) => {
  try {
    const processedData = { ...req.body };
    
    // معالجة صورة الغلاف الجديدة
    if (req.files?.cover_image?.[0]) {
      const coverFile = req.files.cover_image[0];
      processedData.cover_image = `/uploads/images/${coverFile.filename}`;
    }
    
    // معالجة لقطات الشاشة الجديدة
    if (req.files?.screenshots) {
      const newScreenshots = req.files.screenshots.map(file => 
        `/uploads/images/${file.filename}`
      );
      
      // دمج اللقطات الجديدة مع القديمة إذا كان هناك
      if (processedData.screenshots && typeof processedData.screenshots === 'string') {
        try {
          const existingScreenshots = JSON.parse(processedData.screenshots);
          if (Array.isArray(existingScreenshots)) {
            processedData.screenshots = [...existingScreenshots, ...newScreenshots];
          }
        } catch {
          processedData.screenshots = newScreenshots;
        }
      } else if (Array.isArray(processedData.screenshots)) {
        processedData.screenshots = [...processedData.screenshots, ...newScreenshots];
      } else {
        processedData.screenshots = newScreenshots;
      }
    }
    
    // تمرير البيانات للمتحكم
    req.body = processedData;
    await updateReview(req, res);
    
  } catch (error) {
    console.error("❌ خطأ في تحديث الصور:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث الصور"
    });
  }
});

// رفع صورة إضافية للمراجعة
router.post("/:id/upload-image", authAdmin, upload.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "لم يتم رفع أي صورة"
      });
    }
    
    const Review = await import("../models/Review.js");
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    // إضافة الصورة للقائمة
    await Review.default.findByIdAndUpdate(req.params.id, {
      $push: { screenshots: imageUrl }
    });
    
    res.json({
      success: true,
      message: "✅ تم رفع الصورة بنجاح",
      data: {
        filename: req.file.filename,
        url: imageUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
      }
    });
    
  } catch (error) {
    console.error("❌ خطأ في رفع الصورة الإضافية:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء رفع الصورة"
    });
  }
});

// حذف صورة من المراجعة
router.delete("/:id/image/:imageUrl", authAdmin, async (req, res) => {
  try {
    const imageUrl = decodeURIComponent(req.params.imageUrl);
    
    // حذف الصورة من نظام الملفات إذا كانت محلية
    if (imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // حذف الصورة من قاعدة البيانات
    const Review = await import("../models/Review.js");
    
    // إزالة من لقطات الشاشة
    await Review.default.findByIdAndUpdate(req.params.id, {
      $pull: { screenshots: imageUrl }
    });
    
    // التحقق إذا كانت صورة الغلاف وحذفها أيضاً
    const review = await Review.default.findById(req.params.id);
    if (review.cover_image === imageUrl) {
      await Review.default.findByIdAndUpdate(req.params.id, {
        cover_image: '/uploads/images/default/default-game.jpg',
        mainImage: '/uploads/images/default/default-game.jpg',
        coverImage: '/uploads/images/default/default-game.jpg'
      });
    }
    
    res.json({
      success: true,
      message: "✅ تم حذف الصورة بنجاح"
    });
    
  } catch (error) {
    console.error("❌ خطأ في حذف الصورة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الصورة"
    });
  }
});

// تغيير حالة المراجعة
router.patch("/:id/status", authAdmin, updateReviewStatus);

// جلب صور المراجعة
router.get("/:id/images", authAdmin, async (req, res) => {
  try {
    const Review = await import("../models/Review.js");
    const review = await Review.default.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "❌ المراجعة غير موجودة"
      });
    }
    
    const images = {
      cover_image: review.cover_image,
      mainImage: review.mainImage,
      coverImage: review.coverImage,
      screenshots: review.screenshots || []
    };
    
    // إضافة URLs كاملة
    const imagesWithUrls = {
      cover_image: {
        url: images.cover_image,
        fullUrl: images.cover_image.startsWith('http') 
          ? images.cover_image 
          : `${req.protocol}://${req.get('host')}${images.cover_image}`
      },
      screenshots: images.screenshots.map(img => ({
        url: img,
        fullUrl: img.startsWith('http') 
          ? img 
          : `${req.protocol}://${req.get('host')}${img}`
      }))
    };
    
    res.json({
      success: true,
      data: imagesWithUrls
    });
    
  } catch (error) {
    console.error("❌ خطأ في جلب صور المراجعة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الصور"
    });
  }
});

// حذف مراجعة
router.delete("/:id", authAdmin, deleteReview);

// ==================== 🔹 مسار اختبار الرفع ====================
router.post("/test-upload", upload.single('test'), handleUploadError, (req, res) => {
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
        mimetype: req.file.mimetype
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