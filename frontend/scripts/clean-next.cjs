/**
 * Borra .next (caché de Next). Útil si ves Internal Server Error o EINVAL/readlink
 * con el proyecto en OneDrive en Windows.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '.next');
try {
  fs.rmSync(dir, { recursive: true, force: true });
  process.stdout.write('[clean-next] Carpeta .next eliminada.\n');
} catch (e) {
  process.stderr.write(`[clean-next] No se pudo borrar .next: ${e.message}\n`);
  process.exitCode = 0;
}
