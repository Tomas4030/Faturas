import { Controller, Get, Header, Query } from '@nestjs/common';
import { ReportsService, ReportFilters } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('expenses')
  expenses(
    @Query('month') month?: string,
    @Query('category') category?: string,
    @Query('supplier_id') supplierId?: string,
  ) {
    return this.reports.expenses(this.filters(month, category, supplierId));
  }

  @Get('expenses.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="despesas.csv"')
  expensesCsv(
    @Query('month') month?: string,
    @Query('category') category?: string,
    @Query('supplier_id') supplierId?: string,
  ) {
    return this.reports.expensesCsv(this.filters(month, category, supplierId));
  }

  private filters(
    month?: string,
    category?: string,
    supplier_id?: string,
  ): ReportFilters {
    return { month, category, supplier_id };
  }
}
