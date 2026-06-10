import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdir } from 'node:fs/promises';
import { AppModule } from '../src/app.module';
import { UPLOADS_DIR } from '../src/receipts/receipts.service';

// PNG 1x1 válido
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

jest.setTimeout(30000);

describe('Receipts (e2e, extração mock)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.EXTRACTION_MODE = 'mock';
    await mkdir(UPLOADS_DIR, { recursive: true });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('upload → processing → needs_review → PATCH → ready', async () => {
    // 1. Upload
    const upload = await request(app.getHttpServer())
      .post('/receipts')
      .attach('image', PNG_1PX, { filename: 'fatura.png', contentType: 'image/png' })
      .expect(201);
    expect(upload.body.status).toBe('processing');
    const id = upload.body.receipt_id as string;

    // 2. Poll até needs_review (mock demora ~2s)
    let receipt: any;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await request(app.getHttpServer())
        .get(`/receipts/${id}`)
        .expect(200);
      receipt = res.body;
      if (receipt.status !== 'processing') break;
    }
    expect(receipt.status).toBe('needs_review');
    expect(receipt.merchant.name).toBe('Restaurante Sakura');
    expect(receipt.items).toHaveLength(3);
    expect(receipt.items[0].unit_price_cents).toBe(1850);
    expect(receipt.totals.total_cents).toBe(4600);

    // 3. PATCH itens revistos (utilizador corrige a sobremesa para 2 unidades... não,
    // mantém os valores corretos da fatura)
    const patch = await request(app.getHttpServer())
      .patch(`/receipts/${id}/items`)
      .send({
        items: [
          { description: 'Menu Sushi', quantity: 2, unit_price_cents: 1850, total_cents: 3700 },
          { description: 'Coca-Cola', quantity: 2, unit_price_cents: 250, total_cents: 500 },
          { description: 'Sobremesa do dia', quantity: 1, unit_price_cents: 400, total_cents: 400 },
        ],
      })
      .expect(200);
    expect(patch.body.status).toBe('ready');
    expect(patch.body.totals.subtotal_cents).toBe(4600);
    expect(patch.body.warnings).toHaveLength(0);

    // 4. Aparece na listagem
    const list = await request(app.getHttpServer()).get('/receipts').expect(200);
    expect(list.body.some((r: any) => r.id === id)).toBe(true);
  });

  it('PATCH com linha inconsistente devolve warning mas aceita (utilizador é autoridade)', async () => {
    const upload = await request(app.getHttpServer())
      .post('/receipts')
      .attach('image', PNG_1PX, { filename: 'fatura.png', contentType: 'image/png' })
      .expect(201);
    const id = upload.body.receipt_id as string;
    // espera extração mock
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await request(app.getHttpServer()).get(`/receipts/${id}`);
      if (res.body.status !== 'processing') break;
    }

    const patch = await request(app.getHttpServer())
      .patch(`/receipts/${id}/items`)
      .send({
        items: [
          // 2 x 18.50 = 18.50 → inconsistente de propósito
          { description: 'Menu Sushi', quantity: 2, unit_price_cents: 1850, total_cents: 1850 },
        ],
      })
      .expect(200);
    expect(patch.body.status).toBe('ready');
    expect(patch.body.warnings.length).toBeGreaterThan(0);
  });

  it('PATCH inválido (sem itens) devolve 400', async () => {
    const upload = await request(app.getHttpServer())
      .post('/receipts')
      .attach('image', PNG_1PX, { filename: 'fatura.png', contentType: 'image/png' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/receipts/${upload.body.receipt_id}/items`)
      .send({ items: [] })
      .expect(400);
  });

  it('GET de fatura inexistente devolve 404', async () => {
    await request(app.getHttpServer()).get('/receipts/nao-existe').expect(404);
  });
});
