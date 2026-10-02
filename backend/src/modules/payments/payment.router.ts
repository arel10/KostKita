import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import * as paymentController from './payment.controller';
import { createPaymentSchema, updatePaymentSchema, paymentQuerySchema } from './payment.schema';

const router = Router();
router.use(authenticate, authorize('owner'));

router.get('/', validate(paymentQuerySchema, 'query'), paymentController.list);
router.post('/', validate(createPaymentSchema), paymentController.create);
router.get('/:id', paymentController.getById);
router.patch('/:id', validate(updatePaymentSchema), paymentController.update);
router.delete('/:id', paymentController.remove);

export default router;
