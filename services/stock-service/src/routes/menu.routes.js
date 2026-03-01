const express = require('express');
const menuController = require('../controllers/menu.controller');
const { validateInternalApiKey } = require('../middleware/auth.middleware');

const router = express.Router();

// Public endpoints
router.get('/menu', menuController.getAllMenuItems);
router.get('/menu/:id', menuController.getMenuItem);

// Admin endpoints (require API key)
router.post('/menu', validateInternalApiKey, menuController.createMenuItem);
router.put('/menu/:id', validateInternalApiKey, menuController.updateMenuItem);
router.delete('/menu/:id', validateInternalApiKey, menuController.deleteMenuItem);
router.patch('/menu/:id/availability', validateInternalApiKey, menuController.toggleAvailability);

module.exports = router;
