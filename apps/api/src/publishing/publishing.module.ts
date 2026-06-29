import { Module } from '@nestjs/common';
import { PostproxyAdapter } from './postproxy.adapter';
import { PUBLISHING_PROVIDER } from './publishing.interface';

@Module({
  providers: [
    {
      provide: PUBLISHING_PROVIDER,
      useClass: PostproxyAdapter,
    },
  ],
  exports: [PUBLISHING_PROVIDER],
})
export class PublishingModule {}
