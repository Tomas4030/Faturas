import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { SuppliersService } from './suppliers.service';

const renameSupplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const mergeSuppliersSchema = z.object({
  source_id: z.string().trim().min(1),
  target_id: z.string().trim().min(1),
});

@UseGuards(JwtGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  findAll(@Req() req: { userId: string }) {
    return this.suppliers.findAll(req.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { userId: string }) {
    return this.suppliers.findOne(id, req.userId);
  }

  @Put(':id')
  rename(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { userId: string },
  ) {
    const parsed = renameSupplierSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.suppliers.rename(id, parsed.data.name, req.userId);
  }

  @Post('merge')
  merge(
    @Body() body: unknown,
    @Req() req: { userId: string },
  ) {
    const parsed = mergeSuppliersSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.suppliers.merge(parsed.data.source_id, parsed.data.target_id, req.userId);
  }
}
