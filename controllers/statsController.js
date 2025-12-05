// backend/controllers/statsController.js
// Statistics controller using MongoDB data

import Review from "../models/Review.js";
import Comment from "../models/Comment.js";

// Get comprehensive statistics
export const getStats = async (req, res) => {
    try {
        // Basic counts
        const totalReviews = await Review.countDocuments();
        const publishedReviews = await Review.countDocuments({ status: 'published' });
        const draftReviews = await Review.countDocuments({ status: 'draft' });
        
        const totalComments = await Comment.countDocuments();
        const approvedComments = await Comment.countDocuments({ status: 'approved' });
        const pendingComments = await Comment.countDocuments({ status: 'pending' });
        const reportedComments = await Comment.countDocuments({ status: 'reported' });
        
        // Calculate total views
        const reviewsWithViews = await Review.aggregate([
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: { $ifNull: ["$views", 0] } }
                }
            }
        ]);
        const totalViews = reviewsWithViews.length > 0 ? reviewsWithViews[0].totalViews : 0;
        
        // Average rating
        const ratingStats = await Review.aggregate([
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: { $ifNull: ["$rating", 0] } },
                    totalRating: { $sum: { $ifNull: ["$rating", 0] } }
                }
            }
        ]);
        const avgRating = ratingStats.length > 0 ? ratingStats[0].avgRating.toFixed(1) : 0;
        
        // Platform statistics
        const platformStats = await Review.aggregate([
            { $unwind: { path: "$platforms", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$platforms.name",
                    count: { $sum: 1 },
                    totalRating: { $sum: { $ifNull: ["$rating", 0] } },
                    totalViews: { $sum: { $ifNull: ["$views", 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        // Genre statistics
        const genreStats = await Review.aggregate([
            { $match: { genre: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$genre",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        // Monthly statistics (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyReviews = await Review.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        
        const monthlyComments = await Comment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        
        // Top reviews by rating
        const topReviews = await Review.find({ status: 'published' })
            .sort({ rating: -1 })
            .limit(5)
            .select('title rating views createdAt')
            .lean();
        
        // Recent activity
        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title status createdAt')
            .lean();
        
        const recentComments = await Comment.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('author content status reviewId createdAt')
            .lean();
        
        res.json({
            success: true,
            stats: {
                reviews: {
                    total: totalReviews,
                    published: publishedReviews,
                    draft: draftReviews
                },
                comments: {
                    total: totalComments,
                    approved: approvedComments,
                    pending: pendingComments,
                    reported: reportedComments
                },
                views: {
                    total: totalViews
                },
                rating: {
                    average: parseFloat(avgRating)
                },
                platforms: platformStats.map(p => ({
                    name: p._id || 'Unknown',
                    reviews: p.count,
                    avgRating: p.count > 0 ? (p.totalRating / p.count).toFixed(1) : 0,
                    views: p.totalViews
                })),
                genres: genreStats.map(g => ({
                    name: g._id,
                    count: g.count
                })),
                monthly: {
                    reviews: monthlyReviews,
                    comments: monthlyComments
                },
                topReviews,
                recentActivity: {
                    reviews: recentReviews,
                    comments: recentComments
                }
            }
        });
        
    } catch (error) {
        console.error("❌ Error fetching statistics:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب الإحصائيات"
        });
    }
};

