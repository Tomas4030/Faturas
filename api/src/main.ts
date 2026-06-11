import { NestFactory } from '@nestjs/core';
import { createServer } from 'node:net';
import { mkdir } from 'node:fs/promises';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './receipts/receipts.service';

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => { srv.close(); resolve(true); });
    srv.listen(port, '0.0.0.0');
  });
}

async function findPort(preferred: number): Promise<number> {
  for (let p = preferred; p < preferred + 20; p++) {
    if (await isPortFree(p)) return p;
  }
  return 0; // OS picks
}

async function bootstrap() {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const preferred = Number(process.env.PORT) || 3000;
  const port = await findPort(preferred);
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
}
void bootstrap();
