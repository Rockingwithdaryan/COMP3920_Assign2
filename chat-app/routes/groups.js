const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, groupController.getGroups);
router.get('/create', requireLogin, groupController.getCreateGroup);
router.post('/create', requireLogin, groupController.postCreateGroup);
router.get('/:id', requireLogin, groupController.getGroup);
router.post('/:id/invite', requireLogin, groupController.postInvite);

module.exports = router;
