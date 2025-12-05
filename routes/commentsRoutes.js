// routes/commentsRoutes.js
import express from "express";
import {
  addComment,
  getCommentsForReview,
  likeComment,
  reportComment,
  getFeaturedComments,
} from "../controllers/commentsController.js";

const router = express.Router();

// ==================== 🔹 المسارات العامة ====================

// جلب التعليقات المميزة
router.get("/featured", getFeaturedComments);

// إعجاب بتعليق
router.put("/:id/like", likeComment);

// الإبلاغ عن تعليق
router.put("/:id/report", reportComment);

// إضافة تعليق جديد (المسار الصحيح)
router.post("/", addComment);

// جلب جميع التعليقات الخاصة بمراجعة
router.get("/:reviewId", getCommentsForReview);

// ==================== 🔚 انتهاء الملف ====================
export default router;
