// controllers/reviewsController.js

import Review from "../models/Review.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// دالة مساعدة لمعالجة الصور
const processImageData = (imageData) => {
  if (!imageData || imageData === '') {
    return '/uploads/images/default/default-game.jpg';
  }
  
  // إذا كانت الصورة رابطاً محلياً بالفعل
  if (imageData.startsWith('/uploads/')) {
    return imageData;
  }
  
  // إذا كانت base64 أو بيانات صورة
  if (imageData.startsWith('data:image/')) {
    // سنقوم بحفظها لاحقاً
    return null;
  }
  
  // إذا كانت رابط خارجي، نرفضه
  if (imageData.startsWith('http')) {
    console.warn('❌ تم رفض رابط خارجي للصورة:', imageData);
    return '/uploads/images/default/default-game.jpg';
  }
  
  return '/uploads/images/default/default-game.jpg';
};

// دالة لحفظ الصورة من base64
const saveBase64Image = async (base64Data, type = 'cover') => {
  try {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('تنسيق Base64 غير صالح');
    }
    
    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filepath = path.join(__dirname, '../uploads/images', filename);
    
    // التأكد من وجود المجلد
    const uploadsDir = path.join(__dirname, '../uploads/images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // حفظ الصورة
    fs.writeFileSync(filepath, buffer);
    
    return `/uploads/images/${filename}`;
  } catch (error) {
    console.error('❌ خطأ في حفظ الصورة Base64:', error);
    return '/uploads/images/default/default-game.jpg';
  }
};

// ==========================
// Create Review
// ==========================
export const createReview = async (req, res) => {
    try {
        const {
            title,
            game,
            content,
            rating,
            developer,
            publisher,
            releaseDate,
            genre,
            pros,
            cons,
            tags,
            price,
            status,
            comments_enabled,
            cover_image, // ✅ الصورة الرئيسية
            screenshots   // ✅ لقطات الشاشة
        } = req.body;

        // معالجة الصورة الرئيسية
        let processedCoverImage = '/uploads/images/default/default-game.jpg';
        if (cover_image) {
          processedCoverImage = processImageData(cover_image);
          
          // إذا كانت base64، نقوم بحفظها
          if (cover_image.startsWith('data:image/')) {
            processedCoverImage = await saveBase64Image(cover_image, 'cover');
          }
        }

        // معالجة لقطات الشاشة
        let processedScreenshots = [];
        if (screenshots && Array.isArray(screenshots)) {
          for (const screenshot of screenshots) {
            const processed = processImageData(screenshot);
            if (processed && processed !== '/uploads/images/default/default-game.jpg') {
              processedScreenshots.push(processed);
            }
          }
        }

        // Convert lists
        const prosArr =
            typeof pros === "string"
                ? pros.split("\n").filter(Boolean)
                : pros || [];

        const consArr =
            typeof cons === "string"
                ? cons.split("\n").filter(Boolean)
                : cons || [];

        const tagsArr =
            typeof tags === "string"
                ? tags.split(",").map(t => t.trim()).filter(Boolean)
                : tags || [];

        // ==========================
        // FIX purchase_links from FE
        // ==========================
        let purchaseLinks = {};

        if (req.body.purchase_links) {
            try {
                const parsed =
                    typeof req.body.purchase_links === "string"
                        ? JSON.parse(req.body.purchase_links)
                        : req.body.purchase_links;

                for (const [key, value] of Object.entries(parsed)) {
                    if (value?.enabled && value?.url) {
                        purchaseLinks[key] = value.url;
                    }
                }
            } catch (err) {
                console.log("❌ purchase_links parsing error:", err.message);
            }
        }

        // ==========================
        // AUTO BUILD platforms[]
        // ==========================
        let platformsFixed = [];
        if (purchaseLinks) {
            for (const [platform, url] of Object.entries(purchaseLinks)) {
                platformsFixed.push({
                    name: platform.toUpperCase(),
                    url,
                    price: price || 0,
                    available: true,
                    icon: ""
                });
            }
        }

        // ==========================
        // Create review with images
        // ==========================
        const review = new Review({
            title,
            game,
            content,
            rating,
            developer,
            publisher,
            releaseDate,
            genre,
            pros: prosArr,
            cons: consArr,
            tags: tagsArr,

            // ========== الصور ==========
            cover_image: processedCoverImage,
            mainImage: processedCoverImage, // للتوافق
            coverImage: processedCoverImage, // للتوافق
            screenshots: processedScreenshots,
            // ===========================

            platforms: platformsFixed,
            purchase_links: purchaseLinks,

            status: status?.trim()?.toLowerCase() || "draft",
            comments_enabled: comments_enabled !== undefined ? comments_enabled : true
        });

        await review.save();

        console.log(`✅ تم إنشاء مراجعة جديدة مع الصورة: ${review.cover_image}`);

        res.json({
            success: true,
            message: "✅ تم إنشاء المراجعة بنجاح",
            review
        });
    } catch (error) {
        console.error("❌ خطأ في إنشاء المراجعة:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ أثناء إنشاء المراجعة",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ==========================
// Get All Reviews
// ==========================
export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        
        // إضافة URL كامل للصور
        const reviewsWithFullUrls = reviews.map(review => ({
            ...review.toObject(),
            cover_image_full: review.cover_image.startsWith('http') 
                ? review.cover_image 
                : `${req.protocol}://${req.get('host')}${review.cover_image}`,
            screenshots_full: review.screenshots.map(img => 
                img.startsWith('http') 
                    ? img 
                    : `${req.protocol}://${req.get('host')}${img}`
            )
        }));

        res.json({ 
            success: true, 
            count: reviews.length,
            data: reviewsWithFullUrls 
        });
    } catch (error) {
        console.error("❌ خطأ في جلب جميع المراجعات:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ أثناء جلب المراجعات"
        });
    }
};

// ==========================
// Get Single Review
// ==========================
export const getReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "❌ المراجعة غير موجودة"
            });
        }

        // زيادة المشاهدات
        review.views = (review.views || 0) + 1;
        await review.save();

        // تجهيز الروابط الكاملة للصور
        const reviewWithFullUrls = {
            ...review.toObject(),
            cover_image_full: review.cover_image.startsWith('http')
                ? review.cover_image
                : `${req.protocol}://${req.get('host')}${review.cover_image}`,
            screenshots_full: review.screenshots.map(img =>
                img.startsWith('http')
                    ? img
                    : `${req.protocol}://${req.get('host')}${img}`
            )
        };

        // 👈 الفرق الوحيد هنا: بدل "data" نرسل "review"
        res.json({
            success: true,
            review: reviewWithFullUrls
        });

    } catch (error) {
        console.error("❌ خطأ في جلب المراجعة:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب المراجعة"
        });
    }
};


// ==========================
// Update Review
// ==========================
export const updateReview = async (req, res) => {
    try {
        const {
            title,
            game,
            content,
            rating,
            developer,
            publisher,
            releaseDate,
            genre,
            pros,
            cons,
            tags,
            price,
            status,
            comments_enabled,
            cover_image,
            screenshots,
            remove_screenshots // ✅ مصفوفة بالصور المراد حذفها
        } = req.body;

        // جلب المراجعة الحالية
        const currentReview = await Review.findById(req.params.id);
        if (!currentReview) {
            return res.status(404).json({
                success: false,
                message: "❌ المراجعة غير موجودة"
            });
        }

        const updateData = {
            title,
            game,
            content,
            rating,
            developer,
            publisher,
            releaseDate,
            genre
        };

        // ========== معالجة الصورة الرئيسية ==========
        if (cover_image !== undefined) {
            if (cover_image === '') {
                // استخدام الصورة الافتراضية
                updateData.cover_image = '/uploads/images/default/default-game.jpg';
            } else if (cover_image.startsWith('data:image/')) {
                // حفظ الصورة الجديدة من base64
                const newImagePath = await saveBase64Image(cover_image, 'cover');
                updateData.cover_image = newImagePath;
                
                // حذف الصورة القديمة إذا لم تكن افتراضية
                if (currentReview.cover_image && 
                    !currentReview.cover_image.includes('default-game') &&
                    currentReview.cover_image.startsWith('/uploads/')) {
                    const oldImagePath = path.join(__dirname, '..', currentReview.cover_image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log(`🗑️ تم حذف الصورة القديمة: ${currentReview.cover_image}`);
                    }
                }
            } else if (cover_image.startsWith('/uploads/')) {
                // استخدام الصورة المحلية الجديدة
                updateData.cover_image = cover_image;
            }
            
            // مزامنة الحقول الأخرى للتوافق
            updateData.mainImage = updateData.cover_image;
            updateData.coverImage = updateData.cover_image;
        }

        // ========== معالجة لقطات الشاشة ==========
        if (screenshots !== undefined) {
            let processedScreenshots = [];
            
            if (Array.isArray(screenshots)) {
                for (const screenshot of screenshots) {
                    if (screenshot.startsWith('data:image/')) {
                        // حفظ صورة جديدة من base64
                        const newScreenshot = await saveBase64Image(screenshot, 'screenshot');
                        processedScreenshots.push(newScreenshot);
                    } else if (screenshot.startsWith('/uploads/')) {
                        // استخدام الصورة المحلية
                        processedScreenshots.push(screenshot);
                    }
                }
            }
            
            updateData.screenshots = processedScreenshots;
        }

        // حذف الصور المحددة
        if (remove_screenshots && Array.isArray(remove_screenshots)) {
            for (const imagePath of remove_screenshots) {
                if (imagePath.startsWith('/uploads/') && !imagePath.includes('default-')) {
                    const fullPath = path.join(__dirname, '..', imagePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        console.log(`🗑️ تم حذف لقطة الشاشة: ${imagePath}`);
                    }
                }
            }
        }

        // ========== باقي البيانات ==========
        // Pros
        if (pros !== undefined) {
            updateData.pros = Array.isArray(pros)
                ? pros
                : typeof pros === "string"
                ? pros.split("\n").filter(Boolean)
                : [];
        }

        // Cons
        if (cons !== undefined) {
            updateData.cons = Array.isArray(cons)
                ? cons
                : typeof cons === "string"
                ? cons.split("\n").filter(Boolean)
                : [];
        }

        // Tags
        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags)
                ? tags
                : typeof tags === "string"
                ? tags.split(",").map(t => t.trim()).filter(Boolean)
                : [];
        }

        // ==========================
        // FIX purchase_links update
        // ==========================
        if (req.body.purchase_links) {
            updateData.purchase_links = {};

            try {
                const parsed =
                    typeof req.body.purchase_links === "string"
                        ? JSON.parse(req.body.purchase_links)
                        : req.body.purchase_links;

                for (const [key, value] of Object.entries(parsed)) {
                    if (value?.enabled && value?.url) {
                        updateData.purchase_links[key] = value.url;
                    }
                }
            } catch (err) {
                console.log("❌ purchase_links update parsing error:", err);
            }
        }

        // ==========================
        // AUTO BUILD platforms[]
        // ==========================
        if (updateData.purchase_links) {
            updateData.platforms = [];
            for (const [platform, url] of Object.entries(updateData.purchase_links)) {
                updateData.platforms.push({
                    name: platform.toUpperCase(),
                    url,
                    price: price || 0,
                    available: true,
                    icon: ""
                });
            }
        }

        // Status + comments
        if (status) updateData.status = status.trim().toLowerCase();
        if (comments_enabled !== undefined)
            updateData.comments_enabled = comments_enabled;

        // Update review
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        console.log(`✅ تم تحديث المراجعة: ${review.title}`);

        res.json({
            success: true,
            message: "✅ تم تحديث المراجعة بنجاح",
            data: review
        });
    } catch (error) {
        console.error("❌ خطأ في تحديث المراجعة:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ أثناء تحديث المراجعة",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ==========================
// Delete Review
// ==========================
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "❌ المراجعة غير موجودة"
            });
        }

        // حذف الصور المرتبطة
        if (review.cover_image && 
            !review.cover_image.includes('default-game') &&
            review.cover_image.startsWith('/uploads/')) {
            const coverPath = path.join(__dirname, '..', review.cover_image);
            if (fs.existsSync(coverPath)) {
                fs.unlinkSync(coverPath);
            }
        }

        // حذف لقطات الشاشة
        if (review.screenshots && Array.isArray(review.screenshots)) {
            for (const screenshot of review.screenshots) {
                if (screenshot.startsWith('/uploads/') && !screenshot.includes('default-')) {
                    const screenshotPath = path.join(__dirname, '..', screenshot);
                    if (fs.existsSync(screenshotPath)) {
                        fs.unlinkSync(screenshotPath);
                    }
                }
            }
        }

        // حذف المراجعة من قاعدة البيانات
        await Review.findByIdAndDelete(req.params.id);

        console.log(`🗑️ تم حذف المراجعة: ${review.title}`);

        res.json({
            success: true,
            message: "✅ تم حذف المراجعة وصورها بنجاح"
        });
    } catch (error) {
        console.error("❌ خطأ في حذف المراجعة:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ أثناء حذف المراجعة"
        });
    }
};

// ==========================
// Get Published Reviews
// ==========================
export const getPublishedReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10, genre, platform, sort = '-createdAt' } = req.query;
        
        const query = { status: 'published' };
        
        // تطبيق الفلاتر
        if (genre) {
            query.genre = { $regex: genre, $options: 'i' };
        }
        
        if (platform) {
            query['platforms.name'] = { $regex: platform, $options: 'i' };
        }
        
        const reviews = await Review.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Review.countDocuments(query);
        
        // إضافة URLs كاملة للصور
        const reviewsWithUrls = reviews.map(review => ({
            ...review.toObject(),
            cover_image_full: review.cover_image.startsWith('http') 
                ? review.cover_image 
                : `${req.protocol}://${req.get('host')}${review.cover_image}`
        }));
        
        res.json({
            success: true,
            data: reviewsWithUrls,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("❌ خطأ في جلب المراجعات المنشورة:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ أثناء جلب المراجعات"
        });
    }
};

// ==========================
// Update Review Status
// ==========================
export const updateReviewStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "❌ حالة غير صالحة"
            });
        }
        
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "❌ المراجعة غير موجودة"
            });
        }
        
        res.json({
            success: true,
            message: `✅ تم تغيير حالة المراجعة إلى ${status}`,
            data: review
        });
    } catch (error) {
        console.error("❌ خطأ في تغيير حالة المراجعة:", error);
        res.status(500).json({ 
            success: false, 
            message: "حدث خطأ أثناء تغيير الحالة"
        });
    }
};