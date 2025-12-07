// ===============================================================
// ReviewQeem - Upload Server على Contabo (Port 3001)
// الإصدار المحسّن مع الأمان والمراقبة
// ===============================================================
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

// ===============================================================
// 🔧 إعدادات التطبيق
// ===============================================================
const app = express();
const PORT = 3001;

// ===============================================================
// 🛡️ إعدادات الأمان الأساسية
// ===============================================================
app.use(helmet({
  contentSecurityPolicy: false, // تعطيل CSP لأن Nginx يتولى ذلك
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ===============================================================
// 🌐 CORS محسّن
// ===============================================================
app.use(cors({
  origin: [
    'https://reviewqeem.onrender.com',   // تطبيق Render الرئيسي
    'http://localhost:3000',             // تطوير محلي
    'http://localhost:5000',             // تطوير محلي بديل
    'http://127.0.0.1:3000',            // localhost بديل
    'http://127.0.0.1:5000'             // localhost بديل
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Disposition']
}));

// معالجة طلبات OPTIONS مسبقاً
app.options('*', cors());

// ===============================================================
// 📊 مراقبة الطلبات (Logging)
// ===============================================================
app.use(morgan('combined'));

// Middleware مخصص لمراقبة طلبات الرفع
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`🌐 Origin: ${req.headers.origin || 'No Origin'}`);
  console.log(`👤 User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
  console.log(`📦 Content-Type: ${req.headers['content-type'] || 'No Content-Type'}`);
  console.log(`📏 Content-Length: ${req.headers['content-length'] || '0'} bytes`);
  
  // تسجيل المعاملات الهامة في ملف log
  if (req.method === 'POST' && req.url === '/upload') {
    const logEntry = `[${timestamp}] UPLOAD_REQUEST - IP: ${req.ip} - Origin: ${req.headers.origin || 'direct'}\n`;
    fs.appendFileSync('/var/log/upload-server.log', logEntry, 'utf8');
  }
  
  next();
});

// ===============================================================
// 🚫 Rate Limiting للحماية من الهجمات
// ===============================================================
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب لكل IP
  message: {
    success: false,
    message: "لقد تجاوزت عدد محاولات الرفع المسموحة. حاول مرة أخرى بعد 15 دقيقة"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // استخدام IP العميل كمفتاح
    return req.ip || req.connection.remoteAddress;
  }
});

// ===============================================================
// 📁 إعداد Multer للتخزين
// ===============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/var/www/uploads';
    
    // التأكد من وجود المجلد
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Created upload directory: ${uploadDir}`);
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // إنشاء اسم فريد للملف مع الحفاظ على الامتداد
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    console.log(`📝 Generated filename: ${uniqueName} for original: ${file.originalname}`);
    cb(null, uniqueName);
  }
});

// فحص أنواع الملفات المسموح بها
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log(`✅ File type accepted: ${file.mimetype}`);
    cb(null, true);
  } else {
    console.log(`❌ File type rejected: ${file.mimetype}`);
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة فقط (JPEG, PNG, WebP, GIF, SVG)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10 // أقصى 10 ملفات في مرة واحدة
  }
});

// ===============================================================
// 📤 نقاط النهاية (Endpoints)
// ===============================================================

// 1. صفحة الاختبار الرئيسية
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 ReviewQeem Upload Server is Running!',
    version: '2.0.0',
    endpoints: {
      upload: 'POST /upload',
      getFile: 'GET /file/:filename',
      deleteFile: 'DELETE /file/:filename',
      listFiles: 'GET /files'
    },
    limits: {
      maxFileSize: '20MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    }
  });
});

// 2. رفع ملف واحد
app.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.log('❌ No file provided in upload request');
      return res.status(400).json({
        success: false,
        message: 'لم يتم توفير ملف للرفع'
      });
    }

    const fileUrl = `http://84.247.170.23/uploads/${req.file.filename}`;
    
    console.log(`✅ File uploaded successfully: ${req.file.filename}`);
    console.log(`📏 Size: ${req.file.size} bytes`);
    console.log(`🔗 URL: ${fileUrl}`);
    
    // تسجيل النجاح في log file
    const logEntry = `[${new Date().toISOString()}] UPLOAD_SUCCESS - File: ${req.file.filename} - Size: ${req.file.size} - Type: ${req.file.mimetype}\n`;
    fs.appendFileSync('/var/log/upload-success.log', logEntry, 'utf8');

    res.json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الملف',
      error: error.message
    });
  }
});

// 3. رفع عدة ملفات
app.post('/upload-multiple', uploadLimiter, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم توفير ملفات للرفع'
      });
    }

    const filesData = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `http://84.247.170.23/uploads/${file.filename}`
    }));

    console.log(`✅ Uploaded ${filesData.length} files successfully`);

    res.json({
      success: true,
      message: `تم رفع ${filesData.length} ملف بنجاح`,
      files: filesData,
      count: filesData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الملفات',
      error: error.message
    });
  }
});

// 4. الحصول على معلومات ملف
app.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('/var/www/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filename}`);
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود'
      });
    }

    const stats = fs.statSync(filePath);
    res.json({
      success: true,
      filename: filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: `http://84.247.170.23/uploads/${filename}`
    });
    
  } catch (error) {
    console.error('❌ File info error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب معلومات الملف',
      error: error.message
    });
  }
});

// 5. حذف ملف
app.delete('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('/var/www/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Cannot delete - File not found: ${filename}`);
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود'
      });
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️ File deleted: ${filename}`);
    
    // تسجيل الحذف في log
    const logEntry = `[${new Date().toISOString()}] DELETE_SUCCESS - File: ${filename}\n`;
    fs.appendFileSync('/var/log/upload-delete.log', logEntry, 'utf8');

    res.json({
      success: true,
      message: 'تم حذف الملف بنجاح',
      filename: filename,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الملف',
      error: error.message
    });
  }
});

// 6. عرض قائمة الملفات (للتطوير فقط)
app.get('/files', (req, res) => {
  try {
    const uploadDir = '/var/www/uploads';
    
    if (!fs.existsSync(uploadDir)) {
      return res.json({
        success: true,
        message: 'لا توجد ملفات بعد',
        files: [],
        count: 0
      });
    }

    const files = fs.readdirSync(uploadDir);
    const fileList = files.map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        url: `http://84.247.170.23/uploads/${filename}`
      };
    });

    res.json({
      success: true,
      count: fileList.length,
      totalSize: fileList.reduce((sum, file) => sum + file.size, 0),
      files: fileList
    });
    
  } catch (error) {
    console.error('❌ List files error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب قائمة الملفات',
      error: error.message
    });
  }
});

// 7. فحص صحة الخدمة
app.get('/health', (req, res) => {
  const uploadDir = '/var/www/uploads';
  const diskFree = require('diskusage').checkSync(uploadDir);
  
  res.json({
    status: 'healthy',
    server: 'ReviewQeem Upload Server',
    uptime: process.uptime(),
    disk: {
      free: `${Math.round(diskFree.free / 1024 / 1024)} MB`,
      total: `${Math.round(diskFree.total / 1024 / 1024)} MB`,
      percentage: Math.round((diskFree.free / diskFree.total) * 100)
    },
    timestamp: new Date().toISOString()
  });
});

// ===============================================================
// 🚨 معالجة الأخطاء المركزية
// ===============================================================

// معالجة أخطاء Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer Error:', error.code);
    
    let message = 'حدث خطأ أثناء رفع الملف';
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'حجم الملف كبير جداً. الحد الأقصى 20MB';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'تم تجاوز عدد الملفات المسموح به';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'نوع الملف غير متوقع';
    }
    
    return res.status(400).json({
      success: false,
      message: message,
      code: error.code
    });
  }
  
  // معالجة أخطاء عامة
  console.error('❌ Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ غير متوقع في السيرفر',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// معالجة 404
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'الصفحة غير موجودة',
    path: req.url
  });
});

// ===============================================================
// 🚀 بدء السيرفر
// ===============================================================
const startServer = () => {
  try {
    // إنشاء مجلدات log إذا لم تكن موجودة
    const logDir = '/var/log';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // إنشاء مجلد التحميلات
    const uploadDir = '/var/www/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Created upload directory: ${uploadDir}`);
    }
    
    // تعيين صلاحيات المجلدات
    fs.chmodSync(uploadDir, 0o755);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('===============================================');
      console.log(`🚀 Upload Server running on port ${PORT}`);
      console.log('===============================================');
      console.log(`📁 Upload directory: ${uploadDir}`);
      console.log(`🌐 Access URL: http://84.247.170.23:${PORT}`);
      console.log(`📤 Upload endpoint: http://84.247.170.23:${PORT}/upload`);
      console.log(`📄 File serving: http://84.247.170.23/uploads/{filename}`);
      console.log(`🏥 Health check: http://84.247.170.23:${PORT}/health`);
      console.log('===============================================');
      console.log('✅ Server is ready to accept uploads!');
      console.log('===============================================');
      
      // تسجيل بدء التشغيل
      const startupLog = `[${new Date().toISOString()}] SERVER_STARTED - Port: ${PORT} - UploadDir: ${uploadDir}\n`;
      fs.appendFileSync('/var/log/upload-server.log', startupLog, 'utf8');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// بدء السيرفر
startServer();
