const express = require('express');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/google', authController.google);
router.get('/me', auth, authController.me);
router.post('/logout', auth, authController.logout);

module.exports = router;
