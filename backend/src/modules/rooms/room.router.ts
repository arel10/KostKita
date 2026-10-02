import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { uploadImages } from '../../middleware/upload';
import * as roomController from './room.controller';
import { createRoomSchema, updateRoomSchema, roomQuerySchema } from './room.schema';

const router = Router({ mergeParams: true });

router.use(authenticate, authorize('owner'));

router.get('/', validate(roomQuerySchema, 'query'), roomController.list);
router.post('/', validate(createRoomSchema), roomController.create);
router.get('/:id', roomController.getById);
router.patch('/:id', validate(updateRoomSchema), roomController.update);
router.delete('/:id', roomController.remove);
router.post('/:id/photos', uploadImages.array('photos', 10), roomController.uploadPhotos);

export default router;
