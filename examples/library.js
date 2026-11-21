import { createArena, startServer } from '../src/index.js';
const arena = createArena({ persist: false });
const server = await startServer(arena);
console.log(`Open ${server.url}`);
arena.on('event', event => console.log(event.type));
arena.reportError('SyntaxError: Unexpected token ) at app.js:7:3');
process.on('SIGINT', async () => { await server.close(); });
