import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { uploadImages } from '../../middleware/upload';
import * as propertyController from './property.controller';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyQuerySchema,
} from './property.schema';

const router = Router();

router.use(authenticate, authorize('owner'));

router.get('/', validate(propertyQuerySchema, 'query'), propertyController.list);
router.post('/', validate(createPropertySchema), propertyController.create);
router.get('/:id', propertyController.getById);
router.patch('/:id', validate(updatePropertySchema), propertyController.update);
router.delete('/:id', propertyController.remove);
router.post('/:id/publish', propertyController.publish);
router.post('/:id/unpublish', propertyController.unpublish);
router.post('/:id/photos', uploadImages.array('photos', 10), propertyController.uploadPhotos);
router.delete('/:id/photos/:photoId', propertyController.deletePhoto);

export default router;
