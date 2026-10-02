import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import * as tenantController from './tenant.controller';
import { createTenantSchema, updateTenantSchema, tenantQuerySchema, createStaySchema, endStaySchema } from './tenant.schema';

const router = Router();
router.use(authenticate, authorize('owner'));

router.get('/', validate(tenantQuerySchema, 'query'), tenantController.list);
router.post('/', validate(createTenantSchema), tenantController.create);
router.get('/:id', tenantController.getById);
router.patch('/:id', validate(updateTenantSchema), tenantController.update);
router.delete('/:id', tenantController.remove);
router.post('/:id/stays', validate(createStaySchema), tenantController.addStay);
router.patch('/:id/stays/:stayId/end', validate(endStaySchema), tenantController.endStay);

export default router;
