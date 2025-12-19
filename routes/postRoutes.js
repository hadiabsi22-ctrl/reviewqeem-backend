const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');

// فتح قاعدة البيانات مرة واحدة
const db = new Database('/var/www/reviewqeem-backend/database.sqlite', {
  readonly: false,
  fileMustExist: true
});

/**
 * ============================
 * GET /api/posts
 * ?type=post|theory
 * ============================
 */
router.get('/', (req, res) => {
  try {
    const { type } = req.query;

    let sql = `
      SELECT id, title, summary, type, status, created_at
      FROM posts
      WHERE status = 'published'
    `;

    const params = [];

    if (type === 'post' || type === 'theory') {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

/**
 * ============================
 * GET /api/posts/:id
 * ============================
 */
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    // جلب المقال
    const post = db.prepare(`
      SELECT id, title, summary, type, status, created_at
      FROM posts
      WHERE id = ? AND status = 'published'
    `).get(id);

    if (!post) {
      return res.status(404).json({ error: 'Not found' });
    }

    // جلب البلوكات
    const blocks = db.prepare(`
      SELECT type, content, image, position
      FROM post_blocks
      WHERE post_id = ?
      ORDER BY position ASC
    `).all(id);

    post.blocks = blocks;
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
