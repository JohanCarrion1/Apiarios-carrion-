// ============================================================
// BRANDING FIJO
// ============================================================
// La app es de un solo cliente: el nombre, la ubicación y los colores ya no
// vienen de un documento de tenant en Firestore, son constantes.
//
// Estos valores coinciden exactamente con los que se aplicaban antes:
//   - `colores` son los mismos valores que `src/index.css` declara en `:root`
//     para `--color-honey`, `--color-honeysoft` y `--color-deep`, así que
//     quitar la inyección dinámica de CSS no altera el aspecto.
//   - `ubicacion` y `nombreEmpresa` son los textos que ya usaban como
//     fallback el catálogo, las cotizaciones y el header.
//
// El número de Yape/WhatsApp NO se fija aquí: sigue viniendo de
// `WHATSAPP_LABEL` (variable `VITE_WHATSAPP_*` del .env) para poder cambiarlo
// sin recompilar.

export const BRANDING = {
  nombreEmpresa: 'Apiarios Carrión',
  ubicacion: 'Huaraz · Perú',
  colores: {
    primario: '#f0a41c',
    secundario: '#b97d15',
    acento: '#ffc961',
  },
} as const;
