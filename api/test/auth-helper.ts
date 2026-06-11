import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export function bearer(token: string): string {
  return `Bearer ${token}`;
}

export async function registerTestUser(
  app: INestApplication,
  label = 'e2e',
): Promise<{ token: string; userId: string; email: string }> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'password123', name: 'E2E User' })
    .expect(201);
  return { token: res.body.access_token, userId: res.body.user_id, email };
}
