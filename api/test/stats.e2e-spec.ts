import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdir } from 'node:fs/promises';
import { AppModule } from '../src/app.module';
import { UPLOADS_DIR } from '../src/receipts/receipts.service';
import { bearer, registerTestUser } from './auth-helper';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

jest.setTimeout(30000);

describe('Stats (e2e, extração mock)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.EXTRACTION_MODE = 'mock';
    await mkdir(UPLOADS_DIR, { recursive: true });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    token = (await registerTestUser(app, 'stats')).token;

    // garante pelo menos uma fatura no mês da fatura mock (2026-06)
    const upload = await request(app.getHttpServer())
      .post('/receipts')
      .set('Authorization', bearer(token))
      .attach('image', PNG_1PX, { filename: 'f.png', contentType: 'image/png' })
      .expect(201);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await request(app.getHttpServer()).get(
        `/receipts/${upload.body.receipt_id}`,
      ).set('Authorization', bearer(token));
      if (res.body.status !== 'processing') break;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /stats/summary devolve agregados coerentes', async () => {
    const res = await request(app.getHttpServer())
      .get('/stats/summary?month=2026-06')
      .set('Authorization', bearer(token))
      .expect(200);
    const body = res.body;

    expect(body.month).toBe('2026-06');
    expect(body.receipt_count).toBeGreaterThanOrEqual(1);
    expect(body.total_cents).toBeGreaterThan(0);

    // a soma das categorias tem de bater com o total
    const catSum = body.by_category.reduce(
      (s: number, c: any) => s + c.total_cents,
      0,
    );
    expect(catSum).toBe(body.total_cents);

    // a soma dos dias tem de bater com o total
    const daySum = body.by_day.reduce(
      (s: number, d: any) => s + d.total_cents,
      0,
    );
    expect(daySum).toBe(body.total_cents);

    expect(body.top_suppliers.length).toBeGreaterThanOrEqual(1);
    expect(body.top_suppliers[0].name).toBeTruthy();
    expect(Array.isArray(body.insights)).toBe(true);
  });

  it('mês sem dados devolve zeros', async () => {
    const res = await request(app.getHttpServer())
      .get('/stats/summary?month=2020-01')
      .set('Authorization', bearer(token))
      .expect(200);
    expect(res.body.total_cents).toBe(0);
    expect(res.body.receipt_count).toBe(0);
    expect(res.body.insights).toEqual([]);
  });

  it('month inválido devolve 400', async () => {
    await request(app.getHttpServer())
      .get('/stats/summary?month=junho')
      .set('Authorization', bearer(token))
      .expect(400);
  });
});
