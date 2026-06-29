import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { AssetsService } from './assets.service';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssetType, AssetSource } from '@prisma/client';

@Controller('assets')
export class AssetsController {
  constructor(
    private assetsService: AssetsService,
    private storageService: StorageService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('brandId') brandId: string,
    @Body('tags') tags: string,
    @CurrentUser('sub') userId: string,
  ) {
    const tagList = tags ? tags.split(',').map((t) => t.trim()) : [];
    return this.assetsService.upload(file, brandId, userId, tagList);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('brandId') brandId: string,
    @Query('type') type?: AssetType,
    @Query('source') source?: AssetSource,
    @Query('tag') tag?: string,
  ) {
    return this.assetsService.findAllByBrand(brandId, { type, source, tag });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/tags')
  updateTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return this.assetsService.updateTags(id, tags);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }

  @Get('file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.storageService.getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.sendFile(filePath);
  }
}
