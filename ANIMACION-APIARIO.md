Agregar animación suave al cambiar entre apiarios

**Problema:**
Al cambiar de apiario (ej: de "Apiarios Carrión - Huaraz" a "Colmenares JCV - Caraz"), el cambio es instantáneo y brusco. Se desea una transición visual suave que indique que se está "viajando" entre apiarios.

**Comportamiento esperado:**
Cuando el usuario selecciona un apiario diferente en el selector:
1. El contenido actual se desvanece suavemente (fade out)
2. Aparece un indicador de carga sutil (opcional: spinner pequeño o skeleton)
3. El nuevo contenido aparece con fade in suave
4. Duración total: 300-400ms (ni muy rápido ni muy lento)

**Implementación técnica:**

1. **Opción recomendada: Fade + Scale**
- Al cambiar de apiario, el contenedor principal del dashboard hace:
  - Fade out: opacity 1 → 0 (200ms)
  - Scale: scale(1) → scale(0.98) (200ms)
- Breve pausa (50ms)
- Fade in: opacity 0 → 1 (200ms)
- Scale: scale(0.98) → scale(1) (200ms)

2. **Ubicación:**
- `src/components/Dashboard.tsx` o `src/components/ApiaryDashboard.tsx`
- Donde se renderiza el contenido principal del dashboard
- Agregar estado `isTransitioning: boolean` que se activa al cambiar apiario

3. **Código sugerido:**
```tsx
const [isTransitioning, setIsTransitioning] = useState(false);

const handleApiaryChange = (newApiaryId: string) => {
  setIsTransitioning(true);
  setTimeout(() => {
    setCurrentApiaryId(newApiaryId);
    setTimeout(() => setIsTransitioning(false), 100);
  }, 200);
};

// En el render:
<div
  className={`transition-all duration-200 ease-in-out ${
    isTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
  }`}
>
  {/* contenido del dashboard */}
</div>
```

4. **Alternativa: Slide lateral**
- Si se quiere más dinámico: slide a la izquierda al salir, slide desde la derecha al entrar
- Usar `translate-x-[-20px]` → `translate-x-0`

5. **Indicador visual opcional:**
- Mientras está en transición, mostrar un pequeño spinner o skeleton en el título del apiario
- Texto: "Cambiando a [nombre del apiario]..."

**Criterios de verificación:**
- Al cambiar de "Apiarios Carrión" a "Colmenares JCV": animación suave de fade + scale
- Duración total ~300-400ms
- No se pierde información durante la transición
- Los datos del nuevo apiario se cargan correctamente
- La animación no se siente lenta ni entorpece el uso
- Funciona en ambas direcciones (Huaraz → Caraz y Caraz → Huaraz)

**No tocar:**
- La lógica de cambio de apiario (solo agregar la animación visual)
- El selector de apiarios existente
- Los datos que se muestran

TECNOLOGÍAS: React, TypeScript, TailwindCSS, transiciones CSS
