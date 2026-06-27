import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config, isAllowedFileType } from './config';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFileType(file.originalname)) {
      cb(new Error('File type not allowed'));
      return;
    }
    cb(null, true);
  },
});
