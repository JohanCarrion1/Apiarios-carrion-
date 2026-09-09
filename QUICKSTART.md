# 🚀 Inicio Rápido - PANAL

## ⚡ Prueba la Aplicación en 3 Pasos

### 1️⃣ Instalar Dependencias

```bash
npm install
```

### 2️⃣ Ejecutar en Modo Desarrollo

```bash
npm run dev
```

La aplicación se abrirá en: `http://localhost:5173`

### 3️⃣ Iniciar Sesión (Modo Demo)

Usa estas credenciales de prueba:

```
Email: demo@apiarioscarrion.com
Password: demo123
```

¡Eso es todo! Ya puedes explorar la aplicación.

---

## 🎯 ¿Qué Puedes Hacer?

### Una vez dentro del Dashboard:

1. **Ver el Panel Principal**
   - Estado del colmenar (62% saludable)
   - Métricas de cosecha y varroa
   - Gráficas de producción

2. **Explorar el Mapa de Colmenas**
   - 26 colmenas visualizadas en panal hexagonal
   - Filtrar por estado (saludable, revisión, alerta, sin reina)
   - Ver detalles de cada colmena

3. **Registrar Inspecciones**
   - Haz clic en "+ Inspección"
   - Registra datos de cría, miel, varroa
   - Agrega notas de campo

4. **Gestionar Tareas**
   - Ver tareas pendientes
   - Marcar como completadas
   - Agregar nuevas tareas

5. **Ver Cosecha**
   - Gráfica comparativa 2024 vs 2025
   - Métricas de rendimiento
   - Objetivos de producción

---

## 🔐 ¿Quieres Autenticación Real?

### Opción A: Usar Supabase (Recomendado)

1. **Crear cuenta en Supabase**
   - Ve a https://supabase.com
   - Crea un proyecto nuevo (gratis)

2. **Obtener credenciales**
   - Ve a Settings > API
   - Copia "Project URL" y "anon public key"

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` con tus credenciales:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-aqui
   ```

4. **Reiniciar servidor**
   ```bash
   npm run dev
   ```

5. **Probar OAuth**
   - Configura Google/GitHub OAuth en Supabase
   - Prueba login con tus cuentas

### Opción B: Seguir con Modo Demo

Simplemente usa las credenciales de demo:
```
Email: demo@apiarioscarrion.com
Password: demo123
```

---

## 📱 Características Destacadas

### 🎨 Diseño
- Tema ámbar oscuro con acentos dorados
- Patrón hexagonal de fondo
- Animaciones suaves
- Totalmente responsive

### 🔐 Autenticación
- 3 métodos de login (Google, GitHub, Email)
- Persistencia de sesión
- Protección de rutas
- Modo demo incluido

### 📊 Dashboard
- Mapa interactivo de 26 colmenas
- Métricas en tiempo real
- Gráficas de producción
- Sistema de alertas

### 📝 Funcionalidades
- Registro de inspecciones
- Gestión de tareas
- Cuaderno de campo digital
- Monitoreo ambiental

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo

# Producción
npm run build        # Compilar para producción
npm run preview      # Previsualizar build de producción

# Verificación
npm run typecheck    # Verificar tipos TypeScript
```

---

## 📖 Documentación Completa

- **AUTH_README.md** - Guía completa de autenticación
- **README.md** - Documentación general del proyecto
- **AUTH_GUIDE.md** - Configuración de Supabase paso a paso
- **DEPLOYMENT.md** - Guía de despliegue
- **IMPLEMENTATION_SUMMARY.md** - Resumen de implementación

---

## 🆘 ¿Problemas?

### Error: "Invalid API key"
- Verifica que el archivo `.env` existe
- Asegúrate de que las credenciales son correctas
- Reinicia el servidor

### Error: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### La sesión no persiste
- Verifica que localStorage está habilitado
- Limpia caché del navegador
- Revisa la consola para errores

---

## 🎉 ¡Listo!

Ya tienes todo configurado. Disfruta explorando PANAL.

**¿Necesitas ayuda?** Revisa la documentación completa en los archivos markdown.

---

**Happy Beekeeping! 🐝**
