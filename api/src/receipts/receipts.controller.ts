import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { JwtGuard } from '../auth/jwt.guard';
import { ReceiptsService, UPLOADS_DIR } from './receipts.service';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

@UseGuards(JwtGuard)
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
  async create(
    @Req() req: { userId: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Envia uma imagem ou PDF (campo "image", jpeg/png/webp/heic/pdf, máx. 10MB).',
      );
    }
    return this.receipts.create(file, req.userId);
  }

  @Get()
  findAll(@Req() req: { userId: string }, @Query() query: unknown) {
    return this.receipts.findAll(req.userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { userId: string }) {
    return this.receipts.findOne(id, req.userId);
  }

  @Patch(':id/items')
  updateItems(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { userId: string },
  ) {
    return this.receipts.updateItems(id, body, req.userId);
  }

  @Patch(':id')
  updateReceipt(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { userId: string },
  ) {
    return this.receipts.updateReceipt(id, body, req.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { userId: string }) {
    return this.receipts.remove(id, req.userId);
  }
}
