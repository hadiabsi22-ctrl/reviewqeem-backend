import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "عنوان المراجعة مطلوب"],
      trim: true,
      maxlength: [200, "العنوان لا يمكن أن يتجاوز 200 حرف"],
    },

    game: {
      type: String,
      required: [true, "اسم اللعبة مطلوب"],
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },

    summary: {
      type: String,
      maxlength: [500, "الملخص لا يمكن أن يتجاوز 500 حرف"],
      default: "",
    },

    content: {
      type: String,
      required: [true, "محتوى المراجعة مطلوب"],
    },

    rating: {
      type: Number,
      required: [true, "التقييم مطلوب"],
      min: [0, "التقييم لا يمكن أن يكون أقل من 0"],
      max: [10, "التقييم لا يمكن أن يتجاوز 10"],
      set: v => Math.round(v * 10) / 10,
    },

    // معلومات اللعبة
    developer: { 
      type: String, 
      default: "",
      trim: true,
    },
    publisher: { 
      type: String, 
      default: "",
      trim: true,
    },
    releaseDate: { 
      type: String, 
      default: "",
    },
    genre: { 
      type: String, 
      default: "",
      trim: true,
    },

    // الإيجابيات
    pros: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: "لا يمكن إضافة أكثر من 10 إيجابيات"
      }
    },

    // السلبيات
    cons: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: "لا يمكن إضافة أكثر من 10 سلبيات"
      }
    },

    // الوسوم
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 15;
        },
        message: "لا يمكن إضافة أكثر من 15 وسم"
      }
    },

    // منصات الشراء
    platforms: [
      {
        name: { 
          type: String, 
          required: true 
        },
        url: { 
          type: String, 
          default: "" 
        },
        icon: { 
          type: String, 
          default: "" 
        },
        price: { 
          type: Number, 
          default: 0,
          min: 0 
        },
        available: { 
          type: Boolean, 
          default: true 
        },
        _id: false
      },
    ],

    // روابط الشراء الإضافية
    purchase_links: {
      type: Map,
      of: String,
      default: {},
    },

    // ==================== الصور المحلية ====================
    cover_image: {
      type: String,
      default: "/uploads/images/default/default-game.jpg",
      validate: {
        validator: function(v) {
          // قبول الروابط المحلية فقط
          return v === null || 
                 v.startsWith('/uploads/') || 
                 v === '';
        },
        message: "يجب أن تكون صورة الغلاف رابطاً محلياً (يبدأ بـ /uploads/)"
      }
    },

    // حقل إضافي للتوافق مع السكريبتات القديمة
    mainImage: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          return v === null || 
                 v.startsWith('/uploads/') || 
                 v === '';
        },
        message: "يجب أن تكون الصورة رابطاً محلياً (يبدأ بـ /uploads/)"
      }
    },

    // حقل إضافي آخر للتوافق
    coverImage: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          return v === null || 
                 v.startsWith('/uploads/') || 
                 v === '';
        },
        message: "يجب أن تكون صورة الغلاف رابطاً محلياً (يبدأ بـ /uploads/)"
      }
    },

    screenshots: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          if (!Array.isArray(v)) return false;
          
          // التحقق من أن جميع اللقطات محلية
          const allLocal = v.every(url => 
            url === null || 
            url === '' || 
            url.startsWith('/uploads/')
          );
          
          return v.length <= 10 && allLocal;
        },
        message: "يجب أن تكون جميع لقطات الشاشة روابط محلية (تبدأ بـ /uploads/) ولا تتجاوز 10 لقطات"
      }
    },

    // ==================== نهاية قسم الصور ====================

    // إعدادات المراجعة
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },

    featured: {
      type: Boolean,
      default: false,
    },

    comments_enabled: {
      type: Boolean,
      default: true,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    likes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // SEO
    meta_title: { 
      type: String, 
      default: "",
      maxlength: [60, "عنوان الميتا لا يمكن أن يتجاوز 60 حرفاً"]
    },
    
    meta_description: { 
      type: String, 
      default: "",
      maxlength: [160, "وصف الميتا لا يمكن أن يتجاوز 160 حرفاً"]
    },

    // تاريخ المراجعة
    reviewDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // ضمان أن جميع حقول الصور تعود بنفس القيمة
        if (!ret.mainImage && ret.cover_image) {
          ret.mainImage = ret.cover_image;
        }
        if (!ret.coverImage && ret.cover_image) {
          ret.coverImage = ret.cover_image;
        }
        return ret;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        if (!ret.mainImage && ret.cover_image) {
          ret.mainImage = ret.cover_image;
        }
        if (!ret.coverImage && ret.cover_image) {
          ret.coverImage = ret.cover_image;
        }
        return ret;
      }
    }
  }
);

// Middleware لمعالجة الصور قبل الحفظ
ReviewSchema.pre('save', function(next) {
  // إذا كان cover_image فارغاً، استخدم القيمة الافتراضية
  if (!this.cover_image || this.cover_image.trim() === '') {
    this.cover_image = "/uploads/images/default/default-game.jpg";
  }
  
  // مزامنة حقول الصور
  if (!this.mainImage && this.cover_image) {
    this.mainImage = this.cover_image;
  }
  
  if (!this.coverImage && this.cover_image) {
    this.coverImage = this.cover_image;
  }
  
  next();
});

// إضافة virtual field للحصول على التقييم النجمي
ReviewSchema.virtual('starRating').get(function() {
  return Math.round(this.rating / 2);
});

// إضافة virtual field للحصول على رابط الصورة الكامل
ReviewSchema.virtual('cover_image_url').get(function() {
  if (!this.cover_image || this.cover_image === '') {
    return `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/images/default/default-game.jpg`;
  }
  
  if (this.cover_image.startsWith('/')) {
    return `${process.env.BASE_URL || 'http://localhost:5000'}${this.cover_image}`;
  }
  
  return this.cover_image;
});

// إضافة virtual field للصور المصغرة
ReviewSchema.virtual('thumbnail_url').get(function() {
  const url = this.cover_image_url;
  return url.replace('.jpg', '_thumb.jpg').replace('.png', '_thumb.png');
});

// إضافة index للبحث
ReviewSchema.index({ title: 'text', game: 'text', content: 'text', tags: 'text' });
ReviewSchema.index({ status: 1, featured: -1, createdAt: -1 });

// Method لحذف الصور المرتبطة عند حذف المراجعة
ReviewSchema.methods.deleteAssociatedImages = async function() {
  const fs = await import('fs');
  const path = await import('path');
  
  const deleteFile = (filePath) => {
    if (filePath && filePath.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'backend', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  };
  
  // حذف صورة الغلاف
  if (this.cover_image) {
    deleteFile(this.cover_image);
  }
  
  // حذف اللقطات
  if (this.screenshots && Array.isArray(this.screenshots)) {
    this.screenshots.forEach(deleteFile);
  }
};

const Review = mongoose.model("Review", ReviewSchema);
export default Review;