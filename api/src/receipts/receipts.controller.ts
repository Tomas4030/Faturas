import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ReceiptsService, UPLOADS_DIR } from './receipts.service';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname) || '.jpg'}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, ALLOWED_MIME.has(file.mimetype)),
    }),
  )
  async create(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Envia uma imagem (campo "image", jpeg/png/webp/heic, máx. 10MB).',
      );
    }
    return this.receipts.create(file);
  }

  @Get()
  findAll() {
    return this.receipts.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receipts.findOne(id);
  }

  @Patch(':id/items')
  updateItems(@Param('id') id: string, @Body() body: unknown) {
    return this.receipts.updateItems(id, body);
  }

  @Patch(':id')
  updateReceipt(@Param('id') id: string, @Body() body: unknown) {
    return this.receipts.updateReceipt(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.receipts.remove(id);
  }
}
