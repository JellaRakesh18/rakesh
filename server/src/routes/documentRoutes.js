import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { uploadPdfMiddleware } from '../middleware/uploadMiddleware.js';
import {
  uploadDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
} from '../controllers/documentController.js';

const router = Router();

router.use(requireAuth);

router.post('/upload', uploadPdfMiddleware, uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);

export default router;
