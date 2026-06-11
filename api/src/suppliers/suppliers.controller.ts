import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { SuppliersService } from './suppliers.service';

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
}
