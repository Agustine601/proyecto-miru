const express = require('express');
const controller = require('../controllers/workOrdersController');

const router = express.Router();

router.get('/', controller.getWorkOrders);
router.post('/', controller.createWorkOrder);
router.post('/:id/items/:itemIndex/dispatch', controller.dispatchItem);
router.post('/:id/cancel', controller.cancelWorkOrder);

module.exports = router;
