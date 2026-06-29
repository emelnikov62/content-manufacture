import { Body, Controller, Headers, Post, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('postproxy')
  @HttpCode(200)
  postproxy(
    @Body() body: any,
    @Headers('x-webhook-type') type: string,
  ) {
    return this.webhooksService.processEvent(
      'postproxy',
      type || body?.type || 'unknown',
      body,
    );
  }

  @Post('kie')
  @HttpCode(200)
  kie(@Body() body: any) {
    return this.webhooksService.processEvent(
      'kie',
      body?.type || 'task.complete',
      body,
    );
  }
}
