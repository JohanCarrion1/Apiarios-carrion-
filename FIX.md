Fix con evidencia forense: parametrizar HiveComb.tsx por tipo de entidad y etiquetar el botón de regreso — los fixes anteriores no existen en el código entregado
Evidencia forense recolectada con grep sobre la copia de trabajo real, en la carpeta src:
La búsqueda de la cadena "Regresar a inicio" no devuelve ningún resultado: el rotulado del botón de regreso del encabezado nunca quedó aplicado en el código entregado.
La búsqueda de la cadena "núcleos registrados" no devuelve ningún resultado: el estado vacío del bloque de núcleos nunca quedó aplicado.
La búsqueda de la cadena "No hay colmenas registradas" devuelve exactamente tres archivos: src/components/HiveComb.tsx, src/components/Dashboard.tsx y src/components/ApiaryDashboard.tsx. Ahí viven los textos incorrectos que se ven en pantalla dentro del bloque de núcleos.
La búsqueda de "MAPA DEL BANCAL" en mayúsculas no devuelve resultados, lo que prueba que esa etiqueta está escrita en el código con otra capitalización y se muestra en mayúsculas por transformación de estilo. Toda búsqueda futura de estos textos debe hacerse sin distinguir mayúsculas ni minúsculas.
Conclusión que debes respetar:
El componente del mapa es HiveComb.tsx y tiene los textos de colmenas escritos a mano dentro. Dashboard.tsx y ApiaryDashboard.tsx lo reutilizan para pintar tanto el bloque de colmenas como el de núcleos, y como nadie le pasa textos distintos, el bloque de núcleos hereda los de colmenas. Esta vez se trabaja únicamente sobre estos tres archivos y el encabezado.
Trabajo exigido:
Uno — Parametrizar HiveComb.tsx por tipo de entidad:
Saca todos los textos visibles del componente a propiedades con valores por defecto de colmenas: título del bloque ("Colmenas"), etiqueta del conteo ("colonias"), subtítulo de distribución, texto del chip principal ("TODAS"), marcador del buscador ("Buscar colmena..."), mensaje de estado vacío ("No hay colmenas registradas") con su invitación, y texto de ayuda bajo el mapa ("TOCA UNA CELDA PARA VER DETALLES DE LA COLMENA").
El componente debe recibir también el singular de la entidad ("colmena" o "núcleo") para armar los textos de detalle y confirmaciones.
Con los valores por defecto, cualquier uso existente que no pase propiedades sigue mostrando colmenas exactamente como hoy: cero regresiones para el bloque de colmenas.
Dos — Pasar textos de núcleo desde quien renderiza el bloque de núcleos:
En ApiaryDashboard.tsx, y en Dashboard.tsx si también renderiza un bloque de núcleos, la instancia de HiveComb que pinta los núcleos debe recibir las propiedades de entidad en versión núcleo: título "Núcleos", conteo "núcleos", chip principal "TODOS", buscador "Buscar núcleo...", estado vacío "No hay núcleos registrados" con invitación a crear el primer núcleo, y ayuda "TOCA UNA CELDA PARA VER DETALLES DEL NÚCLEO".
El panel de detalle de una celda N-XX debe rotular "NÚCLEO" y hablar en contexto de núcleo en sus acciones y confirmaciones.
El bloque de colmenas no recibe cambios visibles: sigue idéntico a hoy.
Tres — Botón de regreso etiquetado en el encabezado:
Localiza el botón de flecha del encabezado compartido (búscalo por su ícono de flecha o por su navegación hacia la pantalla de selección, no por texto, porque hoy no tiene ninguno).
Conviértelo en un botón pequeño tipo píldora, pegado a la izquierda del menú hamburguesa, con ícono de flecha y el texto visible completo "Regresar a inicio" en ámbar, estilo miniatura del botón de inicio de sesión del login, con estado de presión.
Su navegación no cambia: vuelve a la pantalla de selección conservando sesión y apiario activo.
Debe aparecer igual en todas las vistas del dashboard que usan el encabezado compartido.
Cuatro — Prueba obligatoria antes de dar por terminado:
Ejecuta tú mismo estas búsquedas sobre el código ya modificado y muestra las salidas:
búsqueda de "Regresar a inicio" en src: debe devolver al menos el archivo del encabezado.
búsqueda de "núcleos registrados" en src: debe devolver al menos el archivo donde quedaron los textos de núcleo.
Si alguna falla, corrige y vuelve a ejecutarlas hasta que pasen.
Alcance cerrado:
No toques geometría del mapa, datos, conteos reales, filtros, almacenamiento, separación por usuario y apiario, ni otras vistas o flujos. Solo parametrización de textos en HiveComb y sus consumidores, más el rotulado y reubicación del botón de regreso.
Criterios de verificación en pantalla:
Scroll hasta el bloque de núcleos: título "Núcleos", buscador "Buscar núcleo...", encabezado interno "Núcleos" con conteo "X núcleos", chip "TODOS", estado vacío "No hay núcleos registrados" y ayuda "TOCA UNA CELDA PARA VER DETALLES DEL NÚCLEO". Ninguna palabra colmena dentro del bloque.
Bloque de colmenas idéntico a hoy en todos sus textos.
Encabezado con botón pequeño "Regresar a inicio" pegado al hamburguesa en todas las vistas del dashboard.
TECNOLOGÍAS: React, TypeScript, TailwindCSS
