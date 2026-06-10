import { NestFactory } from '@nestjs/core';
import { mkdir } from 'node:fs/promises';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './receipts/receipts.service';

async function bootstrap() {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // 0.0.0.0 para a app no telemóvel (Expo Go) chegar à API pela rede local
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
