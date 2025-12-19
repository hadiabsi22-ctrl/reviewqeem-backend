const express = require('express');
const router = express.Router();
const db = require('../utils/db');

/**
 * GET /api/posts
 * ?type=post|theory
 */
router.get('/', (req, res) => {
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

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

/**
 * GET /api/posts/:id
 * returns post + blocks
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);

  db.get(
    `SELECT * FROM posts WHERE id = ? AND status = 'published'`,
    [id],
    (err, post) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      db.all(
        `SELECT type, content, position
         FROM post_blocks
         WHERE post_id = ?
         ORDER BY position ASC`,
        [id],
        (err2, blocks) => {
          if (err2) {
            console.error(err2);
            return res.status(500).json({ error: 'Blocks error' });
          }

          post.blocks = blocks || [];
          res.json(post);
        }
      );
    }
  );
});

module.exports = router;
