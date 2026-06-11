import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { ReportsService, ReportFilters } from './reports.service';

@UseGuards(JwtGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('expenses')
  expenses(
    @Query('month') month: string | undefined,
    @Query('category') category: string | undefined,
    @Query('supplier_id') supplierId: string | undefined,
    @Req() req: { userId: string },
  ) {
    return this.reports.expenses(this.filters(month, category, supplierId), req.userId);
  }

  @Get('expenses.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="despesas.csv"')
  expensesCsv(
    @Query('month') month: string | undefined,
    @Query('category') category: string | undefined,
    @Query('supplier_id') supplierId: string | undefined,
    @Req() req: { userId: string },
  ) {
    return this.reports.expensesCsv(this.filters(month, category, supplierId), req.userId);
  }

  private filters(
    month?: string,
    category?: string,
    supplier_id?: string,
  ): ReportFilters {
    return { month, category, supplier_id };
  }
}
