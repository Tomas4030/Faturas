import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
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

  @Put(':id')
  rename(
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.suppliers.rename(id, body.name);
  }

  @Post('merge')
  merge(@Body() body: { source_id: string; target_id: string }) {
    return this.suppliers.merge(body.source_id, body.target_id);
  }
}
