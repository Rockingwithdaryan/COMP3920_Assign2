const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireLogin } = require('../middleware/auth');

router.post('/group/:groupId', requireLogin, messageController.postMessage);
router.post('/reaction/:messageId', requireLogin, messageController.postReaction);

module.exports = router;
