import fs from 'fs';
import path from 'path';
import multer from 'multer';

const root = path.join(process.cwd(), 'uploads', 'lab');
const receiptsRoot = path.join(process.cwd(), 'uploads', 'receipts');

['orders', 'results'].forEach((d) => {
  const p = path.join(root, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

if (!fs.existsSync(receiptsRoot)) fs.mkdirSync(receiptsRoot, { recursive: true });

function safeName(original: string) {
  return `${Date.now()}_${original.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export const orderUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(root, 'orders')),
    filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Solo PDF o imagen (jpg, png)'));
    cb(null, true);
  },
});

export const resultUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(root, 'results')),
    filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Solo PDF o imagen'));
    cb(null, true);
  },
});

export function publicUploadPath(relativeFromLab: string) {
  return `/uploads/lab/${relativeFromLab}`;
}

export const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, receiptsRoot),
    filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Solo PDF o imagen (jpg, png)'));
    cb(null, true);
  },
});
