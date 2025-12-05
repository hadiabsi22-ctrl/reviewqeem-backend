// backend/middleware/upload.js

// 🚫 الرفع معطّل — نستخدم روابط فقط في المشروع
export default function disabledUpload(req, res, next) {
  return res.status(400).json({
    success: false,
    message: "❌ رفع الملفات غير مدعوم. الرجاء استخدام رابط صورة فقط."
  });
}
