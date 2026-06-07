const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const taskController = require('../controllers/taskController');

const router = Router();

router.use(requireAuth);

router.post('/', taskController.create);
router.get('/', taskController.list);
router.get('/:id', taskController.getOne);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.remove);

module.exports = router;
