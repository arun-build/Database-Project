const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, authorize('Admin'), validatePagination, userController.getUsers);
router.get('/roles', authenticate, authorize('Admin'), userController.getRoles);
router.post('/', authenticate, authorize('Admin'), userController.createUser);
router.put('/:id', authenticate, authorize('Admin'), validateIdParam, userController.updateUser);
router.delete('/:id', authenticate, authorize('Admin'), validateIdParam, userController.deleteUser);

module.exports = router;