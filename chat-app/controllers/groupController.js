const db = require('../config/db');

// List all groups the logged-in user is in
exports.getGroups = async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [groups] = await db.query(`
      SELECT 
        cg.id,
        cg.name,
        MAX(m.sent_at) AS last_message_at,
        COUNT(CASE WHEN m.sent_at > COALESCE(mr.last_read_at, '1970-01-01') THEN 1 END) AS unread_count
      FROM chat_groups cg
      JOIN group_members gm ON cg.id = gm.group_id
      LEFT JOIN messages m ON cg.id = m.group_id
      LEFT JOIN message_reads mr ON mr.group_id = cg.id AND mr.user_id = ?
      WHERE gm.user_id = ?
      GROUP BY cg.id, cg.name
      ORDER BY last_message_at DESC
    `, [userId, userId]);

    res.render('groups/index', { groups, groupCount: groups.length });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Show create group form
exports.getCreateGroup = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username FROM users WHERE id != ? ORDER BY username', 
      [req.session.user.id]
    );
    res.render('groups/create', { users, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Create a new group
exports.postCreateGroup = async (req, res) => {
  const { name, members } = req.body;
  const userId = req.session.user.id;

  if (!name || name.trim() === '') {
    const [users] = await db.query('SELECT id, username FROM users WHERE id != ?', [userId]);
    return res.render('groups/create', { users, error: 'Group name is required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO chat_groups (name, created_by) VALUES (?, ?)', 
      [name.trim(), userId]
    );
    const groupId = result.insertId;

    // Always add the creator
    const memberIds = [userId];
    if (members) {
      const selected = Array.isArray(members) ? members : [members];
      selected.forEach(id => { if (!memberIds.includes(parseInt(id))) memberIds.push(parseInt(id)); });
    }

    for (const memberId of memberIds) {
      await conn.query(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', 
        [groupId, memberId]
      );
    }

    await conn.commit();
    res.redirect('/groups');
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send('Server error');
  } finally {
    conn.release();
  }
};

// Show group chat page
exports.getGroup = async (req, res) => {
  const userId = req.session.user.id;
  const groupId = parseInt(req.params.id);

  try {
    // Authorization: check user is a member
    const [membership] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) return res.status(400).send('Access denied.');

    // Get group info
    const [groups] = await db.query('SELECT * FROM chat_groups WHERE id = ?', [groupId]);
    if (groups.length === 0) return res.status(404).send('Group not found.');

    // Get messages with sender username and reactions
    const [messages] = await db.query(`
      SELECT m.id, m.content, m.sent_at, u.username AS sender
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.sent_at ASC
    `, [groupId]);

    // Get reactions for all messages in this group
    const [reactions] = await db.query(`
      SELECT r.message_id, r.emoji, r.user_id, u.username
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.message_id IN (
        SELECT id FROM messages WHERE group_id = ?
      )
    `, [groupId]);

    // Attach reactions to messages
    const reactionsMap = {};
    reactions.forEach(r => {
      if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = {};
      if (!reactionsMap[r.message_id][r.emoji]) reactionsMap[r.message_id][r.emoji] = [];
      reactionsMap[r.message_id][r.emoji].push(r.username);
    });

    messages.forEach(m => {
      m.reactions = reactionsMap[m.id] || {};
    });

    // Get current members
    const [members] = await db.query(`
      SELECT u.id, u.username FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY u.username
    `, [groupId]);

    // Get all users NOT already in the group (for invite)
    const [nonMembers] = await db.query(`
      SELECT id, username FROM users
      WHERE id NOT IN (
        SELECT user_id FROM group_members WHERE group_id = ?
      )
      ORDER BY username
    `, [groupId]);

    // Mark messages as read (upsert)
    await db.query(`
      INSERT INTO message_reads (user_id, group_id, last_read_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE last_read_at = NOW()
    `, [userId, groupId]);

    res.render('groups/chat', {
      group: groups[0],
      messages,
      members,
      nonMembers,
      currentUserId: userId
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Invite a user to a group
exports.postInvite = async (req, res) => {
  const userId = req.session.user.id;
  const groupId = parseInt(req.params.id);
  const { invite_user_id } = req.body;

  try {
    // Authorization check
    const [membership] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) return res.status(400).send('Access denied.');

    await db.query(
      'INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, invite_user_id]
    );
    res.redirect(`/groups/${groupId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Returns just the messages container HTML for polling
exports.getMessagesFragment = async (req, res) => {
  const userId = req.session.user.id;
  const groupId = parseInt(req.params.id);

  try {
    const [membership] = await db.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) return res.status(400).send('Access denied.');

    const [messages] = await db.query(`
      SELECT m.id, m.content, m.sent_at, u.username AS sender
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.sent_at ASC
    `, [groupId]);

    const [reactions] = await db.query(`
      SELECT r.message_id, r.emoji, r.user_id, u.username
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.message_id IN (SELECT id FROM messages WHERE group_id = ?)
    `, [groupId]);

    const reactionsMap = {};
    reactions.forEach(r => {
      if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = {};
      if (!reactionsMap[r.message_id][r.emoji]) reactionsMap[r.message_id][r.emoji] = [];
      reactionsMap[r.message_id][r.emoji].push(r.username);
    });
    messages.forEach(m => { m.reactions = reactionsMap[m.id] || {}; });

    res.render('groups/messages_fragment', {
      messages,
      group: { id: groupId },
      currentUserId: userId
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};