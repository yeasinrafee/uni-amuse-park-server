import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('ticket')
  @HttpCode(HttpStatus.OK)
  async getTicketReport(@Query() query: ReportQueryDto) {
    const report = await this.reportService.getTicketReport(query);
    return {
      message: 'Ticket report generated successfully',
      report,
    };
  }

  @Get('restaurant')
  @HttpCode(HttpStatus.OK)
  async getRestaurantReport(@Query() query: ReportQueryDto) {
    const report = await this.reportService.getRestaurantReport(query);
    return {
      message: 'Restaurant report generated successfully',
      report,
    };
  }

  @Get('room')
  @HttpCode(HttpStatus.OK)
  async getRoomReport(@Query() query: ReportQueryDto) {
    const report = await this.reportService.getRoomReport(query);
    return {
      message: 'Room report generated successfully',
      report,
    };
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverviewReport(@Query() query: ReportQueryDto) {
    const report = await this.reportService.getOverviewReport(query);
    return {
      message: 'Overview report generated successfully',
      report,
    };
  }
}
