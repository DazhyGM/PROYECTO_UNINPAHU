// middlewares/upload.js
const multer = require('multer');
const path = require('path');

// Configuración del almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext); // ejemplo: image-12345678.jpg
  }
});

const extensiones = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.jfif'];

// Acepta la imagen por tipo o por extensión. En Windows el tipo a veces llega vacío.
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const tipo = String(file.mimetype || '').toLowerCase();
  const esImagen = tipo.startsWith('image/') || extensiones.includes(extension);

  if (esImagen) return cb(null, true);
  cb(new Error('Solo se permiten imágenes'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter
});

module.exports = upload;
