const express = require('express');
const router = express.Router();
const { getSecurityStatus, updateSecurityStatus } = require('../controllers/systemSecurityController');

router.get('/status', getSecurityStatus);
router.post('/update', updateSecurityStatus);

module.exports = router;
