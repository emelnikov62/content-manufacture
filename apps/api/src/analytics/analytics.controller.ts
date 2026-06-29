import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  overview(@Query('brandId') brandId: string) {
    return this.analyticsService.getOverview(brandId);
  }

  @Get('snapshots')
  snapshots(
    @Query('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getAccountSnapshots(
      accountId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('dashboard')
  dashboard(@Query('brandId') brandId?: string) {
    return this.analyticsService.getDashboardData(brandId || null);
  }
}
