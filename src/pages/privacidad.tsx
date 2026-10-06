import LegalShell from "./LegalShell";
import { LEGAL_UPDATED_AT } from "../content/legal/LegalParts";
import PrivacidadContent from "../content/legal/PrivacidadContent";

// ============================================================
// Política de Privacidad — ruta pública.
// El contenido vive en `content/legal/PrivacidadContent` porque el modal de
// aceptación de términos lo pinta en superposición sin salir de /seleccionar.
// Esta página solo añade el shell (fondo, cabecera, botón "← Volver").
// ============================================================

export default function Privacidad() {
  return (
    <LegalShell
      badge="PRIVACIDAD"
      title="Política de Privacidad"
      updatedAt={LEGAL_UPDATED_AT}
    >
      <PrivacidadContent />
    </LegalShell>
  );
}
