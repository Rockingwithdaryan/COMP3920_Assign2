const db = require('../config/db');

// Send a new message
exports.postMessage = async (req, res) => {
  const userId = req.session.user.id;
  const groupId = parseInt(req.params.groupId);
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.redirect(`/groups/${groupId}`);
  }

  try {
    // Authorization check
    const [membership] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) return res.status(400).send('Access denied.');

    await db.query(
      'INSERT INTO messages (group_id, user_id, content) VALUES (?, ?, ?)',
      [groupId, userId, content.trim()]
    );

    res.redirect(`/groups/${groupId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Add / toggle an emoji reaction
exports.postReaction = async (req, res) => {
  const userId = req.session.user.id;
  const messageId = parseInt(req.params.messageId);
  const { emoji } = req.body;

  if (!emoji) return res.status(400).send('No emoji provided.');

  try {
    // Make sure the user is a member of the group this message belongs to
    const [rows] = await db.query(`
      SELECT m.group_id FROM messages m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = ? AND gm.user_id = ?
    `, [messageId, userId]);

    if (rows.length === 0) return res.status(400).send('Access denied.');

    const groupId = rows[0].group_id;

    // Toggle: try to insert; if exists, delete it
    const [existing] = await db.query(
      'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [messageId, userId, emoji]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM reactions WHERE id = ?', [existing[0].id]);
    } else {
      await db.query(
        'INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        [messageId, userId, emoji]
      );
    }

    res.redirect(`/groups/${groupId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
