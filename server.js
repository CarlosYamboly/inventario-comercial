const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || '';

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(ROOT, 'data', 'uploads');
const MANIFEST_PATH = path.join(UPLOAD_DIR, 'manifest.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const fixedNames = {
  baseFile: 'base.xlsx',
  regsFile: 'regs.xlsx',
  avanceFile: 'avance.xlsx',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, fixedNames[file.fieldname] || file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.xlsx?$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos .xlsx o .xls'), ok);
  },
});

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (_err) {
    return {};
  }
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function fileInfo(key, fieldName) {
  const manifest = readManifest();
  const item = manifest[key] || {};
  const filename = item.filename || fixedNames[fieldName];
  const filePath = path.join(UPLOAD_DIR, filename);
  const exists = fs.existsSync(filePath);
  return {
    exists,
    originalName: item.originalName || filename,
    filename,
    updatedAt: item.updatedAt || (exists ? fs.statSync(filePath).mtime.toISOString() : null),
    url: exists ? `/uploads/${encodeURIComponent(filename)}` : null,
  };
}

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  },
}));

app.get('/api/status', (_req, res) => {
  const files = {
    base: fileInfo('base', 'baseFile'),
    regs: fileInfo('regs', 'regsFile'),
    avance: fileInfo('avance', 'avanceFile'),
  };
  res.json({
    hasFiles: files.base.exists && files.regs.exists && files.avance.exists,
    files,
    passwordProtected: Boolean(UPLOAD_PASSWORD),
  });
});

function requireUploadPassword(req, res, next) {
  if (!UPLOAD_PASSWORD) return next();
  if (req.get('X-Upload-Password') === UPLOAD_PASSWORD) return next();
  return res.status(401).json({ error: 'Clave de actualización incorrecta.' });
}

app.post('/api/upload', requireUploadPassword, upload.fields([
  { name: 'baseFile', maxCount: 1 },
  { name: 'regsFile', maxCount: 1 },
  { name: 'avanceFile', maxCount: 1 },
]), (req, res) => {
  const files = req.files || {};
  if (!files.baseFile || !files.regsFile || !files.avanceFile) {
    return res.status(400).json({ error: 'Debes subir los tres archivos: PowerBI, registros y avance distribuidoras.' });
  }

  const now = new Date().toISOString();
  const manifest = {
    base: { originalName: files.baseFile[0].originalname, filename: fixedNames.baseFile, updatedAt: now },
    regs: { originalName: files.regsFile[0].originalname, filename: fixedNames.regsFile, updatedAt: now },
    avance: { originalName: files.avanceFile[0].originalname, filename: fixedNames.avanceFile, updatedAt: now },
  };
  writeManifest(manifest);

  res.json({ ok: true, updatedAt: now, files: manifest });
});

app.use((_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventario Comercial corriendo en http://0.0.0.0:${PORT}`);
  if (UPLOAD_PASSWORD) console.log('Carga protegida con UPLOAD_PASSWORD.');
  else console.log('Carga de documentos sin contraseña.');
});
