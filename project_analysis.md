# Análisis del Proyecto y Resumen de Depuración: MonitorCommunicator

## 1. Descripción General del Proyecto

- **Objetivo:** Aplicación en tiempo real para que músicos en un escenario puedan enviar peticiones (ej. "subir volumen") a un técnico de sonido.
- **Stack Tecnológico:**
  - **Frontend:** React (Vite), TypeScript, Tailwind CSS.
  - **Backend:** Node.js, Express, WebSockets (`ws`).
  - **Base de Datos:** PostgreSQL con Drizzle ORM.
  - **Nativo (Móvil):** Capacitor para Android y iOS.
- **Entornos:**
  - **Local:** Desarrollo para Android a través de Android Studio.
  - **Producción:** Despliegue en servicios como Render/Vercel.

## 2. El Problema Fundamental

El problema persistente y no resuelto es que, tras una compilación y sincronización (`npx cap sync android`), la aplicación en Android muestra una **pantalla en blanco** al iniciarse.

El análisis de `logcat` en Android Studio revela consistentemente el siguiente error fatal, que detiene la ejecución del JavaScript:

```
TypeError: Failed to resolve module specifier "@capacitor/core". Relative references must start with either "/", "./", or "../".
```

Este error significa que el `WebView` de Android no puede encontrar ni cargar el "puente" nativo de Capacitor, por lo que cualquier código que intente usar un plugin de Capacitor (como `@capacitor/app`) falla instantáneamente.

## 3. Cronología de Intentos de Solución Fallidos

Se han intentado numerosas estrategias para resolver este problema, la mayoría centradas en la configuración de Vite (`vite.config.ts`). Es crucial que la próxima IA entienda estos fracasos para no repetirlos:

1.  **`build.rollupOptions.external`:** Se intentó marcar los módulos de Capacitor como externos. Esto es **necesario**, pero no suficiente por sí solo.
2.  **`base: './'`:** Se intentó forzar el uso de rutas relativas. Esto también es **necesario**, pero falló al combinarse con otras configuraciones incorrectas.
3.  **Conflicto de `root` y `outDir`:** La estructura del proyecto (código fuente en `/client`) llevó a múltiples configuraciones fallidas de las propiedades `root` y `build.outDir` en `vite.config.ts`, resultando en que los archivos se generaban en el lugar incorrecto.
4.  **Reversión a Versiones "Estables":** Se revirtió el código a un `tag` de Git marcado como `v1.0.0-estable`. Se descubrió que esta versión **también contenía la configuración de compilación defectuosa**, y solo funcionaba previamente debido a archivos cacheados en el entorno de desarrollo de Android. Una limpieza completa reveló el mismo error de la pantalla en blanco.
5.  **`capacitor.config.ts`:** Se añadió la configuración del `server` y se corrigió el `webDir`. Estos cambios son correctos, pero no solucionan el problema de raíz.
6.  **`index.html`:** Se añadió manualmente el script `capacitor.js`. Esto es un parche que no debería ser necesario si la compilación fuera correcta.

## 4. Diagnóstico Final de la Causa Raíz

El problema es una **combinación de múltiples configuraciones incorrectas que deben ser solucionadas simultáneamente.** La causa raíz es la compleja interacción entre:
- La estructura de carpetas del proyecto (`/client`).
- La forma en que Vite resuelve las rutas (`root`, `base`).
- La forma en que Vite empaqueta los módulos (`rollupOptions`).
- Las expectativas del `WebView` de Android sobre cómo se le entregan los archivos.

Cualquier solución que no aborde **todos** estos puntos a la vez está destinada a fallar.

## 5. Estado Actual de los Archivos de Configuración

A continuación se muestra el contenido exacto de los archivos clave en el momento de generar este informe.

### `vite.config.ts`
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  // CRITICAL: Use relative paths for all assets in the final build.
  base: "./",
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  // CRITICAL: Define the source root, which is essential for this project structure.
  root: "client",
  build: {
    // CRITICAL: Output to the project's root 'dist' folder, relative to the 'root' property.
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      // CRITICAL: Prevent bundling of Capacitor's native bridge modules.
      external: [/^@capacitor\/.*/],
    },
  },
});
```

### `capacitor.config.ts`
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.monitorcommunicator',
  appName: 'MonitorCommunicator',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### `package.json` (scripts)
```json
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
```

### `client/index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monitor Communicator</title>
    <script src="capacitor.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## 6. Recomendación para la Próxima IA

1.  **Confía en la configuración actual:** La configuración de los archivos detallada en la sección 5 es el resultado de todos los fracasos anteriores y representa la combinación correcta de todas las directivas necesarias. **No la cambies.**
2.  **Enfócate en el entorno:** El problema ya no es el código, sino el estado del entorno de desarrollo. La prioridad número uno es asegurar una limpieza **absoluta y total** antes de compilar.
3.  **Procedimiento Sugerido:**
    a.  Cerrar Android Studio.
    b.  Eliminar manualmente las carpetas `node_modules`, `dist`, `android/.gradle`, `android/app/build`.
    c.  Ejecutar `npm install`.
    d.  Ejecutar `npx cap sync android`.
    e.  Abrir Android Studio.
    f.  Ejecutar `Build -> Clean Project` y luego `Build -> Rebuild Project`.
    g.  Desinstalar la app del dispositivo de prueba.
    h.  Ejecutar la aplicación.

Este problema ha sido excepcionalmente difícil. Buena suerte.
