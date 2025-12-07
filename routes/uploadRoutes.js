// ===============================================================
// uploadRoutes.js — رفع الصور مباشرة إلى سيرفر Contabo
// ===============================================================

import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import { authAdmin } from "../middleware/authAdmin.js";

const router = express.Router();

// Multer بدون تخزين — فقط للحصول على الملف في الذاكرة
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10
  }
});

// ===============================================================
// 📤 دالة رفع الصورة إلى سيرفر Contabo
// ===============================================================

const uploadToContaba = async (fileBuffer, filename) => {
  const form = new FormData();
  form.append("file", fileBuffer, filename);

  const response = await fetch("http://84.247.170.23:3001/upload", {
    method: "POST",
    body: form,
    headers: form.getHeaders()
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "خطأ أثناء رفع الصورة إلى السيرفر الخارجي");
  }

  return result.url; // رابط الصورة النهائي
};

// ===============================================================
// 📌 رفع صورة واحدة
// POST /api/upload/single
// ===============================================================

router.post("/single", authAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "يرجى اختيار صورة للرفع"
      });
    }

    const filename = `game_${Date.now()}_${req.file.originalname}`;
    const finalUrl = await uploadToContaba(req.file.buffer, filename);

    res.json({
      success: true,
      message: "تم رفع الصورة بنجاح",
      url: finalUrl
    });

  } catch (error) {
    console.error("❌ رفع صورة واحدة فشل:", error.message);
    res.status(500).json({
      success: false,
      message: "خطأ أثناء رفع الصورة",
      error: error.message
    });
  }
});

// ===============================================================
// 📌 رفع عدة صور
// POST /api/upload/multiple
// ===============================================================

router.post("/multiple", authAdmin, upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "لم يتم تحديد أي صور"
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const filename = `game_${Date.now()}_${file.originalname}`;
      const url = await uploadToContaba(file.buffer, filename);
      uploadedFiles.push({ original: file.originalname, url });
    }

    res.json({
      success: true,
      message: "تم رفع الصور بنجاح",
      count: uploadedFiles.length,
      files: uploadedFiles
    });

  } catch (error) {
    console.error("❌ رفع عدة صور فشل:", error.message);
    res.status(500).json({
      success: false,
      message: "خطأ أثناء رفع الصور",
      error: error.message
    });
  }
});

// ===============================================================
// 📌 رفع صورة وربطها بمراجعة معينة
// POST /api/upload/game/:gameId
// ===============================================================

router.post("/game/:gameId", authAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "يجب اختيار صورة" });
    }

    const gameId = req.params.gameId;
    const filename = `review_${gameId}_${Date.now()}_${req.file.originalname}`;

    const finalUrl = await uploadToContaba(req.file.buffer, filename);

    const Review = (await import("../models/Review.js")).default;

    await Review.findByIdAndUpdate(gameId, {
      $push: { screenshots: finalUrl }
    });

    res.json({
      success: true,
      message: "تم رفع الصورة وربطها بالمراجعة بنجاح",
      url: finalUrl,
      gameId: gameId
    });

  } catch (error) {
    console.error("❌ رفع صورة مراجعة فشل:", error.message);
    res.status(500).json({
      success: false,
      message: "خطأ أثناء رفع الصورة",
      error: error.message
    });
  }
});

// ===============================================================
// 🚫 حذف صورة (يتم الحذف عبر سيرفر Contabo فقط)
// DELETE /api/upload/:filename
// ===============================================================

router.delete("/:filename", authAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;

    const response = await fetch(`http://84.247.170.23:3001/file/${filename}`, {
      method: "DELETE"
    });

    const result = await response.json();

    res.json(result);

  } catch (error) {
    console.error("❌ حذف صورة فشل:", error.message);
    res.status(500).json({
      success: false,
      message: "تعذر حذف الصورة",
      error: error.message
    });
  }
});

// ===============================================================
// 📌 اختبار النظام
// ===============================================================

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "نظام رفع الصور يعمل عبر سيرفر Contabo 🎉"
  });
});

export default router;
