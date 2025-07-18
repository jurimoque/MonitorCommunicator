import { WebSocket } from 'ws';

console.log('Probando conexión WebSocket...');

const ws = new WebSocket('ws://localhost:5000/ws?roomId=1');

ws.on('open', function open() {
  console.log('✓ Conexión WebSocket establecida!');
  ws.send(JSON.stringify({ type: 'test', data: 'Hello server' }));
});

ws.on('message', function message(data) {
  console.log('✓ Mensaje recibido:', data.toString());
});

ws.on('error', function error(err) {
  console.error('✗ Error WebSocket:', err);
});

ws.on('close', function close(code, reason) {
  console.log('✗ Conexión cerrada:', code, reason?.toString());
});

// Cerrar después de 5 segundos
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);