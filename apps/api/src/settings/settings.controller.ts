import { Controller, Get, Post, Put, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
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

  @Get('integrations/reveal/:key')
  revealKey(@Param('key') key: string) {
    return this.settingsService.revealKey(key);
  }

  @Post('integrations/verify')
  verifyIntegrations() {
    return this.settingsService.verifyIntegrations();
  }

  @Put('integrations')
  @HttpCode(204)
  updateIntegrations(@Body() body: Record<string, string>) {
    return this.settingsService.updateIntegrations(body);
  }
}
