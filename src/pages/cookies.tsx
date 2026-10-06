import LegalShell from "./LegalShell";
import { LEGAL_UPDATED_AT } from "../content/legal/LegalParts";
import CookiesContent from "../content/legal/CookiesContent";

// ============================================================
// Política de Cookies — ruta pública.
// El contenido vive en `content/legal/CookiesContent` porque el modal de
// aceptación de términos lo pinta en superposición sin salir de /seleccionar.
// Esta página solo añade el shell (fondo, cabecera, botón "← Volver").
// ============================================================

export default function Cookies() {
  return (
    <LegalShell
      badge="COOKIES"
      title="Política de Cookies"
      updatedAt={LEGAL_UPDATED_AT}
    >
      <CookiesContent />
    </LegalShell>
  );
}
