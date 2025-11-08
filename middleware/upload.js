const multer = require('multer');
const path = require('path');

// Configure storage for expense receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'receipt-' + uniqueSuffix + extension);
  }
});

// File filter for receipts (images and PDFs)
const receiptFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF) and PDF files are allowed for receipts'));
  }
};

// Configure multer for expense receipts
const uploadReceipt = multer({
  storage: receiptStorage,
  fileFilter: receiptFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Configure storage for task attachments (reuse existing logic)
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'attachment-' + uniqueSuffix + extension);
  }
});

// File filter for attachments (any file type)
const attachmentFileFilter = (req, file, cb) => {
  // Allow all file types for attachments
  cb(null, true);
};

// Configure multer for task attachments
const uploadAttachment = multer({
  storage: attachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for attachments
  }
});

module.exports = {
  uploadReceipt,
  uploadAttachment
};