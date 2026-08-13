import fs from 'fs';
import path from 'path';
import multer from 'multer';
import type { DoctorDocumentType } from '@prisma/client';

/** Almacenamiento privado: NO se sirve con express.static. */
export const PRIVATE_DOCS_ROOT = path.join(process.cwd(), 'uploads', 'private', 'doctor-docs');

const ALLOWED_TYPES: DoctorDocumentType[] = [
  'CEDULA_ANVERSO',
  'CEDULA_REVERSO',
  'SELFIE_CON_CEDULA',
  'TITULO_MEDICO',
  'CERTIFICADO_SIS',
  'CERTIFICADO_ESPECIALIDAD',
];

export const REQUIRED_DOC_TYPES: DoctorDocumentType[] = [
  'CEDULA_ANVERSO',
  'SELFIE_CON_CEDULA',
  'TITULO_MEDICO',
  'CERTIFICADO_SIS',
];

export function isDoctorDocumentType(value: string): value is DoctorDocumentType {
  return (ALLOWED_TYPES as string[]).includes(value);
}

function ensureRoot() {
  if (!fs.existsSync(PRIVATE_DOCS_ROOT)) {
    fs.mkdirSync(PRIVATE_DOCS_ROOT, { recursive: true });
  }
}

ensureRoot();

function safeName(original: string) {
  return `${Date.now()}_${original.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

/**
 * Guarda el archivo bajo uploads/private/doctor-docs/{doctorId}/
 * Devuelve storageKey relativo: {doctorId}/{filename}
 */
export function doctorDocDestination(doctorId: string) {
  const dir = path.join(PRIVATE_DOCS_ROOT, doctorId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const doctorDocUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const doctorId = (req as { doctorProfileId?: string }).doctorProfileId;
      if (!doctorId) return cb(new Error('Perfil médico no resuelto'), '');
      try {
        cb(null, doctorDocDestination(doctorId));
      } catch (e: any) {
        cb(e, '');
      }
    },
    filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /\.(pdf|jpg|jpeg|png|webp)$/i.test(file.originalname) &&
      /^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(file.mimetype);
    if (!ok) return cb(new Error('Solo PDF o imagen (jpg, png, webp)'));
    cb(null, true);
  },
});

/** Resuelve ruta absoluta segura a partir de storageKey. */
export function resolvePrivateDocPath(storageKey: string): string | null {
  const normalized = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  const abs = path.resolve(PRIVATE_DOCS_ROOT, normalized);
  if (!abs.startsWith(path.resolve(PRIVATE_DOCS_ROOT))) return null;
  return abs;
}

export function deletePrivateDocIfExists(storageKey: string) {
  const abs = resolvePrivateDocPath(storageKey);
  if (!abs) return;
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // ignore
  }
}
