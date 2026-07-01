import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostproxyAdapter } from './postproxy.adapter';
import { PUBLISHING_PROVIDER } from './publishing.interface';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: PUBLISHING_PROVIDER,
      useClass: PostproxyAdapter,
    },
  ],
  exports: [PUBLISHING_PROVIDER],
})
export class PublishingModule {}
