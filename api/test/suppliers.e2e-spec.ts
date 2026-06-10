import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdir } from 'node:fs/promises';
import { AppModule } from '../src/app.module';
import { UPLOADS_DIR } from '../src/receipts/receipts.service';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

jest.setTimeout(30000);

async function uploadAndWait(app: INestApplication): Promise<string> {
  const upload = await request(app.getHttpServer())
    .post('/receipts')
    .attach('image', PNG_1PX, { filename: 'fatura.png', contentType: 'image/png' })
    .expect(201);
  const id = upload.body.receipt_id as string;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const res = await request(app.getHttpServer()).get(`/receipts/${id}`);
    if (res.body.status !== 'processing') return id;
  }
  throw new Error('extração não terminou a tempo');
}

describe('Suppliers (e2e, extração mock)', () => {
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

  it('extração cria/liga fornecedor automaticamente', async () => {
    const id = await uploadAndWait(app);
    const receipt = await request(app.getHttpServer())
      .get(`/receipts/${id}`)
      .expect(200);
    expect(receipt.body.supplier_id).toBeTruthy();
    expect(receipt.body.taxes.length).toBeGreaterThan(0);

    const suppliers = await request(app.getHttpServer())
      .get('/suppliers')
      .expect(200);
    const sakura = suppliers.body.find(
      (s: any) => s.name === 'Restaurante Sakura',
    );
    expect(sakura).toBeTruthy();
    expect(sakura.nif).toBe('123456789');
    expect(sakura.receipt_count).toBeGreaterThanOrEqual(1);
  });

  it('duas faturas do mesmo comerciante ligam ao mesmo fornecedor', async () => {
    const id1 = await uploadAndWait(app);
    const id2 = await uploadAndWait(app);
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer()).get(`/receipts/${id1}`),
      request(app.getHttpServer()).get(`/receipts/${id2}`),
    ]);
    expect(r1.body.supplier_id).toBe(r2.body.supplier_id);
  });

  it('correção de categoria fica memorizada para a próxima fatura', async () => {
    const id = await uploadAndWait(app);
    await request(app.getHttpServer())
      .patch(`/receipts/${id}`)
      .send({ category: 'fornecedor' })
      .expect(200);

    // próxima fatura do mesmo comerciante vem já com a categoria corrigida
    const id2 = await uploadAndWait(app);
    const r2 = await request(app.getHttpServer()).get(`/receipts/${id2}`);
    expect(r2.body.category).toBe('fornecedor');
  });

  it('GET /suppliers/:id devolve detalhe com faturas', async () => {
    const suppliers = await request(app.getHttpServer()).get('/suppliers');
    const sakura = suppliers.body.find(
      (s: any) => s.name === 'Restaurante Sakura',
    );
    const detail = await request(app.getHttpServer())
      .get(`/suppliers/${sakura.id}`)
      .expect(200);
    expect(detail.body.receipts.length).toBeGreaterThanOrEqual(1);
    expect(detail.body.total_cents).toBeGreaterThan(0);
  });

  it('PATCH /receipts/:id com categoria inválida devolve 400', async () => {
    const id = await uploadAndWait(app);
    await request(app.getHttpServer())
      .patch(`/receipts/${id}`)
      .send({ category: 'nao-existe' })
      .expect(400);
  });
});
