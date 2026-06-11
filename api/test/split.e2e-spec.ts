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

describe('Split sessions (e2e, extração mock)', () => {
  let app: INestApplication;
  let receiptId: string;
  let token: string;

  beforeAll(async () => {
    process.env.EXTRACTION_MODE = 'mock';
    await mkdir(UPLOADS_DIR, { recursive: true });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const upload = await request(app.getHttpServer())
      .post('/receipts')
      .attach('image', PNG_1PX, { filename: 'f.png', contentType: 'image/png' })
      .expect(201);
    receiptId = upload.body.receipt_id;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await request(app.getHttpServer()).get(
        `/receipts/${receiptId}`,
      );
      if (res.body.status !== 'processing') break;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria sessão e devolve token forte', async () => {
    const res = await request(app.getHttpServer())
      .post(`/receipts/${receiptId}/split-sessions`)
      .expect(201);
    token = res.body.public_token;
    expect(token).toMatch(/^spl_/);
    expect(token.length).toBeGreaterThan(20);
    expect(res.body.share_path).toBe(`/s/${token}`);
  });

  it('reutiliza sessão aberta existente', async () => {
    const res = await request(app.getHttpServer())
      .post(`/receipts/${receiptId}/split-sessions`)
      .expect(201);
    expect(res.body.public_token).toBe(token);
  });

  it('serve a página pública', async () => {
    const res = await request(app.getHttpServer())
      .get(`/s/${token}`)
      .expect(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Dividir conta');
  });

  it('fluxo: 2 participantes escolhem itens e o resumo bate certo', async () => {
    const session = await request(app.getHttpServer())
      .get(`/split-sessions/${token}`)
      .expect(200);
    // fatura mock: 2x Menu Sushi 37,00 + 2x Coca-Cola 5,00 + 1x Sobremesa 4,00 = 46,00
    const items = session.body.items;
    expect(items).toHaveLength(3);
    const sushi = items.find((i: any) => i.description === 'Menu Sushi');
    const cola = items.find((i: any) => i.description === 'Coca-Cola');
    const sobremesa = items.find((i: any) =>
      i.description.startsWith('Sobremesa'),
    );

    const joao = (
      await request(app.getHttpServer())
        .post(`/split-sessions/${token}/participants`)
        .send({ display_name: 'João' })
        .expect(201)
    ).body.participant_id;
    const maria = (
      await request(app.getHttpServer())
        .post(`/split-sessions/${token}/participants`)
        .send({ display_name: 'Maria' })
        .expect(201)
    ).body.participant_id;

    // João: 1 sushi + 1 cola; Maria: 1 sushi + 1 cola + sobremesa
    await request(app.getHttpServer())
      .put(`/split-sessions/${token}/participants/${joao}/claims`)
      .send({
        claims: [
          { receipt_item_id: sushi.id, quantity_claimed: 1 },
          { receipt_item_id: cola.id, quantity_claimed: 1 },
        ],
      })
      .expect(200);
    const summary = (
      await request(app.getHttpServer())
        .put(`/split-sessions/${token}/participants/${maria}/claims`)
        .send({
          claims: [
            { receipt_item_id: sushi.id, quantity_claimed: 1 },
            { receipt_item_id: cola.id, quantity_claimed: 1 },
            { receipt_item_id: sobremesa.id, quantity_claimed: 1 },
          ],
        })
        .expect(200)
    ).body;

    const j = summary.participants.find((p: any) => p.display_name === 'João');
    const m = summary.participants.find((p: any) => p.display_name === 'Maria');
    expect(j.total_cents).toBe(1850 + 250); // 21,00
    expect(m.total_cents).toBe(1850 + 250 + 400); // 25,00
    expect(j.total_cents + m.total_cents).toBe(4600);
    expect(summary.unclaimed).toHaveLength(0);
  });

  it('fechar sessão bloqueia novas claims mas mantém o resumo', async () => {
    await request(app.getHttpServer())
      .post(`/split-sessions/${token}/close`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/split-sessions/${token}/participants`)
      .send({ display_name: 'Atrasado' })
      .expect(410);
    const summary = await request(app.getHttpServer())
      .get(`/split-sessions/${token}/summary`)
      .expect(200);
    expect(summary.body.status).toBe('closed');
    expect(summary.body.participants).toHaveLength(2);
  });

  it('token inválido devolve 404', async () => {
    await request(app.getHttpServer())
      .get('/split-sessions/spl_nao_existe')
      .expect(404);
  });
});
