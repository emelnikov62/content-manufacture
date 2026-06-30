import { Controller, Post, Get, Delete, Patch, Param, Query, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GenerationsService } from './generations.service';

@UseGuards(JwtAuthGuard)
@Controller('generations')
export class GenerationsController {
  constructor(private generationsService: GenerationsService) {}

  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      brandId: string;
      model: string;
      modelName: string;
      provider: string;
      type: string;
      prompt: string;
      params?: Record<string, any>;
    },
  ) {
    return this.generationsService.create({
      userId: req.user.sub,
      ...body,
    });
  }

  @Get()
  findAll(@Query('brandId') brandId: string, @Query('limit') limit?: string) {
    return this.generationsService.findByBrand(brandId, limit ? parseInt(limit) : 20);
  }

  @Get('media')
  findMedia(@Query('brandId') brandId: string, @Query('type') type?: string) {
    return this.generationsService.findMedia(brandId, type);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.generationsService.cancel(id);
  }

  @Delete('errors')
  @HttpCode(204)
  removeAllErrors(@Query('brandId') brandId: string) {
    return this.generationsService.removeAllErrors(brandId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.generationsService.findById(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.generationsService.remove(id);
  }
}
