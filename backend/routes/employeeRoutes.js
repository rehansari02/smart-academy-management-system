const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const { getEmployees, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');

const upload = require('../middlewares/uploadMiddleware');

router.route('/')
    .get(protect, checkPermission('Employee', 'view'), getEmployees)
    .post(protect, checkPermission('Employee', 'add'), upload.single('photo'), createEmployee);

router.route('/:id')
    .put(protect, checkPermission('Employee', 'edit'), upload.single('photo'), updateEmployee)
    .delete(protect, checkPermission('Employee', 'delete'), deleteEmployee);

module.exports = router;