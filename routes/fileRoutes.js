// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/FileController');

// Existing routes (e.g., /MyUploads, /UploadFile, /DeleteFile, etc.)
router.get('/MyUploads', fileController.getMyUploads);
router.post('/UploadFile', fileController.uploadFile);
router.post('/DeleteFile', fileController.deleteFile);
router.post('/DownloadFile', fileController.downloadFile);
router.get('/SharedWithMe/:id?', fileController.getSharedWithMe);
router.get('/MySharedLinks', fileController.getMySharedLinks);
router.post('/DeleteLink', fileController.deleteLink);
router.get('/SharedViaLink/:hash', fileController.getSharedViaLink);
router.post('/ShareViaLink', fileController.shareViaLink);
router.get('/Search', fileController.searchFiles);

// New API endpoints for CRUD and drag-and-drop:
router.post('/api/createFolder', fileController.createFolder);
router.post('/api/renameItem', fileController.renameItem);
router.post('/api/deleteItem', fileController.deleteItem);
router.get('/api/directory', fileController.getDirectoryStructure);
router.post('/api/moveItem', fileController.moveItem);

module.exports = router;
