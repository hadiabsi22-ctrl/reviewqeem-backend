// backend/controllers/adminCommentsController.js - ES6 Modules Version
import Comment from '../models/Comment.js';

export const getAllComments = async (req, res) => {
    try {
        const comments = await Comment.find().sort({ createdAt: -1 });
        res.json({ success: true, comments });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching comments" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        await Comment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Comment deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting comment" });
    }
};

export const approveComment = async (req, res) => {
    try {
        await Comment.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.json({ success: true, message: "Comment approved" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error approving comment" });
    }
};

export const rejectComment = async (req, res) => {
    try {
        await Comment.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.json({ success: true, message: "Comment rejected" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error rejecting comment" });
    }
};
