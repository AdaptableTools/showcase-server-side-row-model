import { defaultPort } from './config.js';
import { createApp } from './app.js';
import { getDatabaseContext } from './db/client.js';
import { ensureDatabaseReady } from './db/seed.js';

const context = getDatabaseContext();
ensureDatabaseReady(context.sqlite);

const app = createApp();

app.listen(defaultPort, () => {
  console.log(`Started SQLite node server on localhost:${defaultPort}`);
});
