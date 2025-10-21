# MonitorCommunicator

Este proyecto es una aplicación de control de monitores de escenario en tiempo real que permite a los músicos comunicarse con los técnicos de sonido.

## Arquitectura de Producción

Este proyecto está desplegado en una arquitectura moderna en la nube:

-   **Frontend:** Alojado en [Vercel](https://vercel.com).
    -   **URL:** [https://monitor-communicator.vercel.app/](https://monitor-communicator.vercel.app/)
-   **Backend (Servidor Web):** Alojado como un Web Service en [Render](https://render.com).
    -   **URL:** [https://monitorcommunicator.onrender.com](https://monitorcommunicator.onrender.com)
-   **Base de Datos:** PostgreSQL gestionado por [Render](https://render.com).

El frontend se conecta automáticamente al backend desplegado.

---

## Desarrollo Local

1.  **Instalar dependencias:**
    ```sh
    npm install
    ```

2.  **Configurar variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto y añade la URL de tu base de datos (puede ser una local o la de Render para desarrollo).
    ```
    DATABASE_URL=tu_url_de_postgresql
    ```

3.  **Ejecutar el servidor de desarrollo:**
    (Esto iniciará tanto el frontend de Vite como el backend de Express)
    ```sh
    npm run dev
    ```

---

## Empaquetado para Móvil (Android/iOS)

Este proyecto utiliza Capacitor para empaquetar la aplicación web como una aplicación móvil nativa.

### Requisitos

*   Node.js y npm
*   Para Android: [Android Studio](https://developer.android.com/studio)
*   Para iOS (solo en macOS): [Xcode](https://developer.apple.com/xcode/) y CocoaPods

### Pasos para compilar

1.  **Construir la aplicación web:**
    Este comando compila el código de React/Vite y lo coloca en la carpeta `dist`.
    ```sh
    npm run build
    ```

2.  **Sincronizar los cambios:**
    Este comando copia los archivos web construidos en los proyectos nativos de Android y iOS.
    ```sh
    npx cap sync
    ```

3.  **Abrir el proyecto nativo:**

    *   **Para Android:**
        ```sh
        npx cap open android
        ```
        (Asegúrate de abrir la carpeta `android` directamente en Android Studio si el comando no funciona).

    *   **Para iOS (solo en macOS):**
        ```sh
        npx cap open ios
        ```