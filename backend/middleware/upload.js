const multer = require('multer');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Disk storage — files are temporarily written to backend/tmp.
// They are streamed to B2 and immediately deleted to prevent RAM exhaustion.
const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename to prevent collisions and path traversal
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedStandardAudio = [
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/aac',
  ];
  const allowedLosslessAudio = [
    'audio/flac', 'audio/wav',
  ];
  const allowedImages = [
    'image/jpeg', 'image/png', 'image/webp',
  ];

  if (file.fieldname === 'audioStandard') {
    if (allowedStandardAudio.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Standard audio must be MP3, AAC, M4A, or OGG'), false);
    }
  } else if (file.fieldname === 'audioLossless') {
    if (allowedLosslessAudio.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Lossless audio must be FLAC or WAV'), false);
    }
  } else if (file.fieldname === 'cover') {
    if (allowedImages.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for cover (jpeg, png, webp)'), false);
    }
  } else {
    cb(new Error(`Unexpected field: ${file.fieldname}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB global file size limit
});

module.exports = upload;
