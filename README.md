# MonitorCommunicator

Este proyecto es una aplicación de control de monitores de escenario en tiempo real que permite a los músicos comunicarse con los técnicos de sonido.

## Desarrollo Web

1.  **Instalar dependencias:**
    ```sh
    npm install
    ```

2.  **Ejecutar el servidor de desarrollo:**
    (Esto iniciará tanto el frontend de Vite como el backend de Express)
    ```sh
    npm run dev
    ```

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
        Este comando abrirá el proyecto en Android Studio. Desde allí, puedes ejecutar la aplicación en un emulador o en un dispositivo físico, y generar un `.apk` o `.aab` para su publicación.

    *   **Para iOS (solo en macOS):**
        ```sh
        npx cap open ios
        ```
        Este comando abrirá el proyecto en Xcode. Desde allí, puedes ejecutar la aplicación en el simulador de iOS o en un iPhone.
