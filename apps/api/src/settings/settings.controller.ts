import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
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

  @Put('integrations')
  updateIntegrations(@Body() body: Record<string, string>) {
    return this.settingsService.updateIntegrations(body);
  }
}
