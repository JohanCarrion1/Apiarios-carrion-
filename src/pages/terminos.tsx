import LegalShell from "./LegalShell";
import { LEGAL_UPDATED_AT } from "../content/legal/LegalParts";
import TerminosContent from "../content/legal/TerminosContent";

// ============================================================
// Términos y Condiciones — ruta pública.
// El contenido vive en `content/legal/TerminosContent` porque el modal de
// aceptación de términos lo pinta en superposición sin salir de /seleccionar.
// Esta página solo añade el shell (fondo, cabecera, botón "← Volver").
// ============================================================

export default function Terminos() {
  return (
    <LegalShell
      badge="TÉRMINOS"
      title="Términos y Condiciones"
      updatedAt={LEGAL_UPDATED_AT}
    >
      <TerminosContent />
    </LegalShell>
  );
}
