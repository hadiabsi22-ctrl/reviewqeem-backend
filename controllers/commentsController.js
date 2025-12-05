// backend/controllers/commentsController.js - النسخة الكاملة
import Comment from "../models/Comment.js";
import { sanitizeComment, sanitizeEmail, sanitizeTitle } from "../utils/sanitize.js";

// ================ الدوال المطلوبة لـ commentsRoutes.js ================

// 1. إضافة تعليق جديد
export const addComment = async (req, res) => {
  try {
    let { reviewId, author, content, email, website } = req.body;

    // Honeypot check - if website field is filled, it's likely a bot
    if (website && website.trim() !== '') {
        return res.status(200).json({
            success: true,
            message: "تم إرسال التعليق بنجاح! ينتظر الموافقة."
        });
    }

    // Sanitize inputs
    reviewId = String(reviewId || '').trim();
    author = sanitizeTitle(author || 'مجهول');
    content = sanitizeComment(content || '');
    email = sanitizeEmail(email);
    
    if (!reviewId || !content) {
      return res.status(400).json({
        success: false,
        message: "المراجعة والمحتوى مطلوبة"
      });
    }
    
    // Get user IP for rate limiting
    const userIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check for spam (same content from same IP in last 5 minutes)
    const recentComment = await Comment.findOne({
      userIP,
      content,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    if (recentComment) {
      return res.status(429).json({
        success: false,
        message: "يرجى الانتظار قبل إرسال تعليق آخر"
      });
    }
    
    const newComment = new Comment({
      reviewId,
      author,
      email,
      content,
      status: 'pending',
      userIP
    });
    
    await newComment.save();
    
    res.json({
      success: true,
      message: "✅ تم إرسال التعليق بنجاح! ينتظر الموافقة.",
      comment: newComment
    });
  } catch (error) {
    console.error("❌ Error in addComment:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إضافة التعليق"
    });
  }
};

// 2. الحصول على تعليقات مراجعة معينة
export const getCommentsForReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const comments = await Comment.find({ reviewId, status: 'approved' })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error("❌ Error in getCommentsForReview:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب تعليقات المراجعة"
    });
  }
};

// 3. إضافة إعجاب لتعليق
export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "التعليق غير موجود"
      });
    }
    
    res.json({
      success: true,
      message: "👍 تمت إضافة الإعجاب",
      likes: comment.likes
    });
  } catch (error) {
    console.error("❌ Error in likeComment:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إضافة الإعجاب"
    });
  }
};

// 4. الإبلاغ عن تعليق
export const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findByIdAndUpdate(
      id,
      { $inc: { reports: 1 } },
      { new: true }
    );
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "التعليق غير موجود"
      });
    }
    
    res.json({
      success: true,
      message: "⚠️ تم الإبلاغ عن التعليق",
      reports: comment.reports
    });
  } catch (error) {
    console.error("❌ Error in reportComment:", error);
    res.status(500).json({
      success: false,
      message: "فشل في الإبلاغ عن التعليق"
    });
  }
};

// 5. الحصول على التعليقات المميزة
export const getFeaturedComments = async (req, res) => {
  try {
    const comments = await Comment.find({ 
      featured: true, 
      status: 'approved' 
    }).limit(10);
    
    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error("❌ Error in getFeaturedComments:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب التعليقات المميزة"
    });
  }
};

// ================ الدوال المطلوبة لـ commentsAdminRoutes.js ================

// 6. الحصول على جميع التعليقات
export const getAllComments = async (req, res) => {
  try {
    const comments = await Comment.find().sort({ createdAt: -1 });
    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في جلب التعليقات" });
  }
};

// 7. الحصول على التعليقات المعلقة
export const getPendingComments = async (req, res) => {
  try {
    const comments = await Comment.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في جلب التعليقات المعلقة" });
  }
};

// 8. الموافقة على تعليق
export const approveComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    res.json({ success: true, message: "✅ تمت الموافقة", comment });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في الموافقة" });
  }
};

// 9. رفض تعليق
export const rejectComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json({ success: true, message: "❌ تم الرفض", comment });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في الرفض" });
  }
};

// 10. حذف تعليق
export const deleteComment = async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "🗑️ تم الحذف" });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في الحذف" });
  }
};

// 11. تبديل التميز
export const toggleFeatured = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    comment.featured = !comment.featured;
    await comment.save();
    res.json({ 
      success: true, 
      message: comment.featured ? "⭐ تم التميز" : "تم إلغاء التميز",
      comment 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في التبديل" });
  }
};

// 12. الحصول على التعليقات المبلغ عنها
export const getReportedComments = async (req, res) => {
  try {
    const comments = await Comment.find({ 
      $or: [
        { status: "reported" },
        { reports: { $gte: 3 } }
      ]
    });
    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في جلب التعليقات المبلغ عنها" });
  }
};

// 13. إحصائيات التعليقات
export const getCommentsStats = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const total = await Comment.countDocuments({ reviewId });
    const approved = await Comment.countDocuments({ reviewId, status: "approved" });
    const pending = await Comment.countDocuments({ reviewId, status: "pending" });
    const featured = await Comment.countDocuments({ reviewId, featured: true });
    
    res.json({
      success: true,
      stats: { total, approved, pending, featured }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في جلب الإحصائيات" });
  }
};

// 14. الحصول على تعليقات مستخدم
export const getUserComments = async (req, res) => {
  try {
    const { userName } = req.query;
    const comments = await Comment.find({ 
      author: { $regex: userName, $options: "i" }
    });
    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في جلب تعليقات المستخدم" });
  }
};

// 15. تحديث تعليق
export const updateComment = async (req, res) => {
  try {
    const { author, content } = req.body;
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { author, content },
      { new: true }
    );
    res.json({ success: true, message: "✅ تم التحديث", comment });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل في التحديث" });
  }
};