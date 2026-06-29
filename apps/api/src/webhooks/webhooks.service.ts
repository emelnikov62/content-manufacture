import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async processEvent(source: string, type: string, payload: unknown) {
    const event = await this.prisma.webhookEvent.create({
      data: {
        source,
        type,
        payloadJson: payload as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Webhook ${source}/${type} stored: ${event.id}`);

    try {
      await this.handleEvent(source, type, payload);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.error(`Webhook processing error: ${err.message}`);
    }

    return { received: true };
  }

  private async handleEvent(source: string, type: string, payload: any) {
    switch (`${source}:${type}`) {
      case 'postproxy:publication.success':
        break;
      case 'postproxy:publication.error':
        break;
      case 'postproxy:message.received':
        break;
      case 'postproxy:referral.received':
        break;
      default:
        this.logger.debug(`Unhandled webhook: ${source}/${type}`);
    }
  }
}
