import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('integrations')
  getIntegrations() {
    return this.settingsService.getIntegrations();
  }

  @Post('integrations/verify')
  verifyIntegrations() {
    return this.settingsService.verifyIntegrations();
  }

  @Put('integrations')
  updateIntegrations(@Body() body: Record<string, string>) {
    return this.settingsService.updateIntegrations(body);
  }
}
