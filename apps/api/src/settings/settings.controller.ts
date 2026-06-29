import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private config: ConfigService) {}

  @Get('integrations')
  integrations() {
    return {
      postproxy: !!this.config.get('POSTPROXY_API_KEY'),
      kie: !!this.config.get('KIE_API_KEY'),
      ensembleData: !!this.config.get('ENSEMBLE_API_KEY'),
    };
  }
}
