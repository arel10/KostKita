import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { uploadProof } from '../../middleware/upload';
import * as subController from './subscription.controller';
import { submitPaymentSchema, rejectPaymentSchema } from './subscription.schema';

const router = Router();

// ── Owner routes ──────────────────────────────
router.get('/current', authenticate, authorize('owner'), subController.getCurrent);
router.get('/history', authenticate, authorize('owner'), subController.getHistory);
router.get('/plans', subController.getPlans); // Public — listing plans
router.get('/payment-methods', subController.getPaymentMethods); // Public/Owner — active payment info (bank & QRIS)
router.post('/payments', authenticate, authorize('owner'), uploadProof.single('proof'), validate(submitPaymentSchema), subController.submitProof);
router.get('/payments', authenticate, authorize('owner'), subController.getMyPayments);

// ── Admin routes ──────────────────────────────
router.get('/admin/payments', authenticate, authorize('super_admin'), subController.adminListPayments);
router.post('/admin/payments/:id/approve', authenticate, authorize('super_admin'), subController.adminApprove);
router.post('/admin/payments/:id/reject', authenticate, authorize('super_admin'), validate(rejectPaymentSchema), subController.adminReject);

export default router;
