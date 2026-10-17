import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'src', 'App.tsx');

const GOOD_COMMIT = 'e2679742427ebe16f77c612a0c59526118c1c215';
const URL =
  'https://raw.githubusercontent.com/JohanCarrion1/Apiarios-carrion-/' +
  GOOD_COMMIT +
  '/src/App.tsx';

/** Reemplaza el onboarding CreateApiaryModal por UserWelcomeModal (ya crea el apiario). */
function patchOnboarding(src) {
  const oldBlock = `  if (target.kind === 'onboarding') {
    return (
      <CreateApiaryModal
        open
        variant="screen"
        title="Crea tu primer apiario"
        subtitle="Comienza registrando tu primer apiario para gestionar sus colmenas en el dashboard."
        submitLabel="Crear y entrar al dashboard"
        onCreated={(newId) => navigate(\`/dashboard/\${newId}\`)}
      />
    );
  }`;

  const newBlock = `  if (target.kind === 'onboarding') {
    // Misma pantalla de bienvenida: crea el apiario y entra al dashboard.
    // Se eliminó CreateApiaryModal en pantalla completa (duplicado e inútil).
    return (
      <UserWelcomeModal
        variant="screen"
        open
        onSaved={() => {
          // Tras guardar, recargar para resolver el apiario creado
          window.location.assign('/dashboard');
        }}
      />
    );
  }`;

  if (!src.includes(oldBlock)) {
    // Fallback más flexible por si el formato cambió ligeramente
    const re = /if \(target\.kind === 'onboarding'\) \{[\s\S]*?<CreateApiaryModal[\s\S]*?\/>\s*\);\s*\}/;
    if (re.test(src)) {
      return src.replace(re, newBlock.trim().replace(/^  /gm, '  '));
    }
    console.warn('WARN: onboarding CreateApiaryModal block not found; App.tsx sin parche');
    return src;
  }
  return src.replace(oldBlock, newBlock);
}

async function main() {
  try {
    const existing = fs.readFileSync(outPath, 'utf8');
    if (
      existing.length > 50000 &&
      existing.includes('IntroHead') &&
      existing.includes("target.kind === 'onboarding'") &&
      existing.includes('UserWelcomeModal') &&
      !existing.includes('Crea tu primer apiario')
    ) {
      console.log('src/App.tsx already OK (' + existing.length + ' bytes)');
      return;
    }
  } catch {
    /* falta */
  }

  console.log('Downloading App.tsx from commit', GOOD_COMMIT, '...');
  const res = await fetch(URL);
  if (!res.ok) {
    console.error('Failed to download App.tsx:', res.status, res.statusText);
    process.exit(1);
  }
  let text = await res.text();
  if (text.length < 50000 || !text.includes('IntroHead')) {
    console.error('Downloaded App.tsx looks invalid (len=' + text.length + ')');
    process.exit(1);
  }

  text = patchOnboarding(text);
  fs.writeFileSync(outPath, text);
  console.log('Restored+patched src/App.tsx (' + text.length + ' bytes)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
