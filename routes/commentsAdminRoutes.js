// backend/routes/commentsAdminRoutes.js
import express from "express";
import {
  getAllComments,
  getPendingComments,
  approveComment,
  rejectComment,
  deleteComment,
  toggleFeatured,
  getReportedComments,
  getCommentsStats,
  getUserComments,
  updateComment
} from "../controllers/commentsController.js";

import { authAdmin } from "../middleware/authAdmin.js";

const router = express.Router();

// ===============================================================
// 🔐 جميع المسارات هنا محمية — مسؤول فقط
// ===============================================================

router.get("/", authAdmin, getAllComments);
router.get("/pending", authAdmin, getPendingComments);
router.get("/reported", authAdmin, getReportedComments);
router.get("/stats/:reviewId", authAdmin, getCommentsStats);
router.get("/user", authAdmin, getUserComments);

router.put("/:id/approve", authAdmin, approveComment);
router.put("/:id/reject", authAdmin, rejectComment);
router.put("/:id/featured", authAdmin, toggleFeatured);
router.put("/:id/update", authAdmin, updateComment);

router.delete("/:id", authAdmin, deleteComment);

export default router;
