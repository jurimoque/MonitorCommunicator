export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Home / Role Selection
    selectRole: 'Selecciona tu rol',
    musician: 'Músico',
    technician: 'Técnico',

    // Room Management
    roomManagement: 'Gestión de Sala',
    createRoom: 'Crear Sala',
    joinRoom: 'Unirse a Sala',
    roomName: 'Nombre de la Sala',
    create: 'Crear',
    join: 'Unirse',
    cancel: 'Cancelar',

    // Instruments
    'Batería': 'Batería',
    'Bajo': 'Bajo',
    'Guitarra': 'Guitarra',
    'Teclados': 'Teclados',
    'Voz Principal': 'Voz Principal',
    'Coros': 'Coros',
    'Percusión': 'Percusión',

    // Instrument Selection
    selectInstrument: 'Selecciona tu instrumento',
    createCustomInstrument: '+ Crear instrumento personalizado',
    instrumentPlaceholder: 'Nombre del instrumento (ej: Saxofón, Violín, etc.)',
    confirm: 'Confirmar',
    instrumentCreated: 'Instrumento creado',
    instrumentAvailable: 'ahora está disponible para todos en la sala',

    // Request Form
    yourInstrument: 'Tu instrumento',
    change: 'Cambiar',
    me: 'YO',
    sending: 'ENVIANDO...',
    volumeDown: '- VOLUMEN',
    volumeUp: '+ VOLUMEN',
    reverbDown: 'REVERB -',
    reverbUp: 'REVERB +',
    thanks: '✓ GRACIAS',
    assistance: '⚠ ASISTENCIA',

    // Actions
    requestSent: 'Petición enviada',
    requestSentDesc: 'Se ha enviado tu petición para',
    volumeUpAction: 'subir el volumen',
    volumeDownAction: 'bajar el volumen',
    reverbUpAction: 'aumentar el reverb',
    reverbDownAction: 'disminuir el reverb',
    thanksAction: 'agradecer al técnico',
    assistanceAction: 'solicitar asistencia',

    // Technician Panel
    requestQueue: 'Cola de Peticiones',
    clearQueue: 'Limpiar Cola',
    noConnection: 'Sin conexión',
    reconnecting: 'No hay conexión con el servidor. Desliza hacia abajo para refrescar la página.',
    queueCleared: 'Cola limpiada',
    queueClearedDesc: 'Se han completado todas las peticiones',
    requestCompleted: 'Petición completada',
    requestCompletedDesc: 'La petición ha sido marcada como completada',
    completed: 'Completado',
    noPendingRequests: 'No hay peticiones pendientes',
    thanksMessage: '✓ GRACIAS',
    assistanceMessage: '⚠ SOLICITA ASISTENCIA',

    // Errors
    error: 'Error',
    errorSendingRequest: 'No se pudo enviar la petición. Por favor, inténtalo de nuevo.',
    errorSavingInstrument: 'No se pudo guardar el instrumento personalizado. Inténtalo de nuevo.',
    errorClearingQueue: 'No se pudieron completar todas las peticiones',
    errorCompletingRequest: 'No se pudo completar la petición',

    // Join Room Form
    roomNamePlaceholder: 'código de sala',
    searching: 'Buscando...',
    creating: 'Creando...',
    roomNotFound: 'Sala no encontrada',
    roomNotFoundDesc: 'No existe una sala llamada "{name}". ¿Quieres crearla?',
    joinedExistingRoom: 'Te uniste a sala existente',
    joinedExistingRoomDesc: 'Ya existía una sala llamada "{name}", te conectamos a ella.',
    roomCreated: 'Sala creada',
    roomCreatedDesc: 'Nueva sala "{name}" creada exitosamente.',
    connected: 'Conectado',
    connectedDesc: 'Te uniste a la sala "{name}".',
    errorProcessingRequest: 'No se pudo procesar la solicitud',
    enterRoomName: 'Por favor ingresa un nombre para la sala',
    joinInfo: 'Conecta a una sala existente',
    createInfo: 'Crea nueva o usa existente si ya hay una',

    // Settings
    settings: 'Configuración',
    visualFlash: 'Destello Visual',
    visualFlashDesc: 'Parpadear pantalla al recibir notificaciones',
    sound: 'Sonido',
    soundDesc: 'Reproducir sonido al recibir notificaciones',
    appearance: 'Apariencia',
    language: 'Idioma',
    theme: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    close: 'Cerrar',
  },
  en: {
    // Home / Role Selection
    selectRole: 'Select your role',
    musician: 'Musician',
    technician: 'Technician',

    // Room Management
    roomManagement: 'Room Management',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    roomName: 'Room Name',
    create: 'Create',
    join: 'Join',
    cancel: 'Cancel',

    // Instruments
    'Batería': 'Drums',
    'Bajo': 'Bass',
    'Guitarra': 'Guitar',
    'Teclados': 'Keyboards',
    'Voz Principal': 'Lead Vocals',
    'Coros': 'Backing Vocals',
    'Percusión': 'Percussion',

    // Instrument Selection
    selectInstrument: 'Select your instrument',
    createCustomInstrument: '+ Create custom instrument',
    instrumentPlaceholder: 'Instrument name (e.g. Saxophone, Violin, etc.)',
    confirm: 'Confirm',
    instrumentCreated: 'Instrument created',
    instrumentAvailable: 'is now available to everyone in the room',

    // Request Form
    yourInstrument: 'Your instrument',
    change: 'Change',
    me: 'ME',
    sending: 'SENDING...',
    volumeDown: '- VOLUME',
    volumeUp: '+ VOLUME',
    reverbDown: 'REVERB -',
    reverbUp: 'REVERB +',
    thanks: '✓ THANKS',
    assistance: '⚠ ASSISTANCE',

    // Actions
    requestSent: 'Request sent',
    requestSentDesc: 'Your request has been sent to',
    volumeUpAction: 'increase volume',
    volumeDownAction: 'decrease volume',
    reverbUpAction: 'increase reverb',
    reverbDownAction: 'decrease reverb',
    thanksAction: 'thank the technician',
    assistanceAction: 'request assistance',

    // Technician Panel
    requestQueue: 'Request Queue',
    clearQueue: 'Clear Queue',
    noConnection: 'No connection',
    reconnecting: 'No connection to server. Swipe down to refresh the page.',
    queueCleared: 'Queue cleared',
    queueClearedDesc: 'All requests have been completed',
    requestCompleted: 'Request completed',
    requestCompletedDesc: 'The request has been marked as completed',
    completed: 'Completed',
    noPendingRequests: 'No pending requests',
    thanksMessage: '✓ THANKS',
    assistanceMessage: '⚠ REQUESTS ASSISTANCE',

    // Errors
    error: 'Error',
    errorSendingRequest: 'Could not send the request. Please try again.',
    errorSavingInstrument: 'Could not save custom instrument. Try again.',
    errorClearingQueue: 'Could not complete all requests',
    errorCompletingRequest: 'Could not complete the request',

    // Join Room Form
    roomNamePlaceholder: 'venue code',
    searching: 'Searching...',
    creating: 'Creating...',
    roomNotFound: 'Room not found',
    roomNotFoundDesc: 'Room "{name}" does not exist. Do you want to create it?',
    joinedExistingRoom: 'Joined existing room',
    joinedExistingRoomDesc: 'A room called "{name}" already existed, we connected you to it.',
    roomCreated: 'Room created',
    roomCreatedDesc: 'New room "{name}" created successfully.',
    connected: 'Connected',
    connectedDesc: 'You joined room "{name}".',
    errorProcessingRequest: 'Could not process the request',
    enterRoomName: 'Please enter a room name',
    joinInfo: 'Connect to an existing room',
    createInfo: 'Create new or use existing if there\'s one',

    // Settings
    settings: 'Settings',
    visualFlash: 'Visual Flash',
    visualFlashDesc: 'Flash screen on new notifications',
    sound: 'Sound',
    soundDesc: 'Play sound on new notifications',
    appearance: 'Appearance',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    close: 'Close',
  }
};

export const getTranslation = (lang: Language, key: keyof typeof translations.es): string => {
  return translations[lang][key] || key;
};
