import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBrandDto, UpdateBrandDto } from './brands.dto';

@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  findAll(@CurrentUser('sub') userId: string) {
    return this.brandsService.findAllForUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.brandsService.findById(id, userId);
  }

  @Post()
  create(@Body() dto: CreateBrandDto, @CurrentUser('sub') userId: string) {
    return this.brandsService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.brandsService.update(id, dto, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.brandsService.delete(id, userId);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.brandsService.getMembers(id, userId);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { email: string; role: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.brandsService.addMemberByEmail(id, body.email, body.role as any, userId);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.brandsService.removeMember(id, memberId, userId);
  }
}
