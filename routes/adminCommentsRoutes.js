const express = require('express');
const router = express.Router();
const adminCommentsController = require('../controllers/adminCommentsController');
const adminAuth = require('../middlewares/adminAuth');

router.get('/', adminAuth, adminCommentsController.getAllComments);
router.delete('/:id', adminAuth, adminCommentsController.deleteComment);
router.put('/:id/approve', adminAuth, adminCommentsController.approveComment);
router.put('/:id/reject', adminAuth, adminCommentsController.rejectComment);

module.exports = router;
