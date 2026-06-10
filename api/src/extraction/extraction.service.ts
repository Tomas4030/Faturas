import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EXTRACTION_PROMPT } from './prompt';
import { MOCK_RECEIPT } from './mock-receipt';
import { parseModelResponse } from './parse-response';

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Envia a imagem da fatura ao modelo de visão e devolve o JSON bruto
   * (ainda por validar — a validação é feita em postprocess()).
   */
  async extract(imageBuffer: Buffer, mimeType: string): Promise<unknown> {
    if (this.config.get('EXTRACTION_MODE', 'mock') === 'mock') {
      this.logger.log('EXTRACTION_MODE=mock: a devolver fatura de exemplo');
      await sleep(2000);
      return structuredClone(MOCK_RECEIPT);
    }
    return this.extractWithModel(imageBuffer, mimeType);
  }

  private async extractWithModel(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<unknown> {
    const model = this.config.get<string>('EXTRACTION_MODEL');
    if (!model) {
      throw new Error('EXTRACTION_MODEL não definido no .env');
    }
    const dataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.getClient().chat.completions.create(
          {
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: EXTRACTION_PROMPT },
                  { type: 'image_url', image_url: { url: dataUri } },
                ],
              },
            ],
            temperature: 0,
          },
          { timeout: REQUEST_TIMEOUT_MS },
        );
        const text = response.choices[0]?.message?.content ?? '';
        return parseModelResponse(text);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Tentativa ${attempt}/${MAX_ATTEMPTS} de extração falhou: ${String(error)}`,
        );
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        baseURL: this.config.get<string>('OPENAI_BASE_URL'),
        apiKey: this.config.get<string>('OPENAI_API_KEY'),
      });
    }
    return this.client;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
