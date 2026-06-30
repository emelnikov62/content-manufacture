import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { StorageService } from './storage.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [AssetsController],
  providers: [AssetsService, StorageService],
  exports: [AssetsService],
})
export class AssetsModule {}
