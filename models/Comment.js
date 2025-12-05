// backend/models/Comment.js - النسخة المصححة
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      required: true,
      index: true // Index for filtering by review
    },
    author: {
      type: String,
      default: 'مجهول',
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'reported', 'rejected'],
      default: 'pending',
      index: true // Index for filtering by status
    },
    likes: {
      type: Number,
      default: 0
    },
    reports: {
      type: Number,
      default: 0
    },
    featured: {
      type: Boolean,
      default: false
    },
    userIP: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      enum: ['website', 'mobile', 'api'],
      default: 'website'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
commentSchema.index({ reviewId: 1, status: 1, createdAt: -1 });
commentSchema.index({ reviewId: 1, featured: 1, likes: -1 });

// Virtual Field
commentSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
commentSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'approved') {
    this.reports = 0;
  }
  return this.save();
};

commentSchema.methods.addLike = function() {
  this.likes += 1;
  return this.save();
};

commentSchema.methods.addReport = function() {
  this.reports += 1;
  if (this.reports >= 5 && this.status !== 'reported') {
    this.status = 'reported';
  }
  return this.save();
};

commentSchema.methods.makeFeatured = function() {
  this.featured = true;
  return this.save();
};

// Static Methods
commentSchema.statics.getByReviewId = function(reviewId, status = 'approved') {
  return this.find({ reviewId, status })
    .sort({ createdAt: -1 })
    .limit(100);
};

commentSchema.statics.getPendingByReviewId = function(reviewId) {
  return this.find({ reviewId, status: 'pending' })
    .sort({ createdAt: 1 });
};

commentSchema.statics.getReportedComments = function() {
  return this.find({ 
    $or: [
      { status: 'reported' },
      { reports: { $gte: 3 } }
    ]
  })
  .sort({ reports: -1, createdAt: -1 });
};

commentSchema.statics.getFeaturedComments = function(reviewId = null) {
  const query = { featured: true, status: 'approved' };
  if (reviewId) {
    query.reviewId = reviewId;
  }
  return this.find(query)
    .sort({ likes: -1, createdAt: -1 })
    .limit(10);
};

commentSchema.statics.getReviewStats = function(reviewId) {
  return this.aggregate([
    { $match: { reviewId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLikes: { $sum: '$likes' },
        totalReports: { $sum: '$reports' }
      }
    }
  ]);
};

commentSchema.statics.getPopularComments = function(limit = 5) {
  return this.find({ status: 'approved' })
    .sort({ likes: -1 })
    .limit(limit);
};

// Middleware
commentSchema.pre('save', function(next) {
  if (!this.author || this.author.trim() === '') {
    this.author = 'مجهول';
  }
  if (this.content && this.content.length > 500) {
    this.content = this.content.substring(0, 500);
  }
  if (this.reports >= 10 && this.status !== 'rejected') {
    this.status = 'rejected';
  }
  next();
});

commentSchema.post('save', function(doc, next) {
  console.log(`✅ تم حفظ/تحديث التعليق: ${doc._id} - ${doc.status}`);
  next();
});

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;