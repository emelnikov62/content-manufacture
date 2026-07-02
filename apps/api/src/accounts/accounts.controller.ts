import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  findAll(@Query('brandId') brandId: string) {
    return this.accountsService.findAllByBrand(brandId);
  }

  @Get('postproxy/profiles')
  getProfiles() {
    return this.accountsService.getProfiles();
  }

  @Get('postproxy/groups')
  getProfileGroups() {
    return this.accountsService.getProfileGroups();
  }

  @Post('connect/telegram')
  connectTelegram(
    @Body() body: { brandId: string; botToken: string; profileGroupId?: string },
  ) {
    return this.accountsService.connectTelegram(
      body.brandId,
      body.botToken,
      body.profileGroupId,
    );
  }

  @Post('connect/oauth')
  connectOAuth(
    @Body() body: { platform: string; redirectUrl: string },
  ) {
    return this.accountsService.initOAuthConnection(body.platform, body.redirectUrl);
  }

  @Post('connect/oauth/complete')
  completeOAuth(
    @Body() body: { brandId: string; platform: string },
  ) {
    return this.accountsService.completeOAuthConnection(body.brandId, body.platform);
  }

  @Get(':id/placements')
  getPlacements(@Param('id') id: string) {
    return this.accountsService.getPlacements(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @Query('placementId') placementId?: string) {
    return this.accountsService.getProfileStats(id, placementId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.accountsService.delete(id);
  }
}
