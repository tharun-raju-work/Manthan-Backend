const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');

const registerValidation = [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', authController.login);

module.exports = router;
