import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin')
  async getAdminStats() {
    return this.analyticsService.getAdminStats();
  }

  @Get('user/:userId')
  async getUserStats(@Param('userId') userId: string) {
    return this.analyticsService.getUserStats(userId);
  }
}
