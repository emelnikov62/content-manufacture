import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TrendsService } from './trends.service';

@UseGuards(JwtAuthGuard)
@Controller('trends')
export class TrendsController {
  constructor(private trendsService: TrendsService) {}

  @Get('tiktok/hashtag')
  tiktokHashtag(
    @Query('name') name: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.trendsService.tiktokHashtag(name, cursor);
  }

  @Get('tiktok/keyword')
  tiktokKeyword(
    @Query('name') name: string,
    @Query('cursor') cursor?: string,
    @Query('period') period?: string,
    @Query('sorting') sorting?: string,
    @Query('country') country?: string,
  ) {
    return this.trendsService.tiktokKeyword(name, cursor, period, sorting, country);
  }

  @Get('tiktok/post')
  tiktokPostInfo(@Query('url') url: string) {
    return this.trendsService.tiktokPostInfo(url);
  }

  @Get('instagram/search')
  instagramSearch(@Query('text') text: string) {
    return this.trendsService.instagramSearch(text);
  }

  @Get('instagram/reels')
  instagramUserReels(
    @Query('userId') userId: string,
    @Query('depth') depth?: string,
  ) {
    return this.trendsService.instagramUserReels(userId, depth);
  }

  @Get('instagram/user')
  instagramUserInfo(@Query('username') username: string) {
    return this.trendsService.instagramUserInfo(username);
  }

  @Get('instagram/post')
  instagramPostInfo(@Query('code') code: string) {
    return this.trendsService.instagramPostInfo(code);
  }

  @Get('youtube/keyword')
  youtubeKeyword(
    @Query('keyword') keyword: string,
    @Query('depth') depth?: string,
    @Query('period') period?: string,
    @Query('sorting') sorting?: string,
  ) {
    return this.trendsService.youtubeKeyword(keyword, depth, period, sorting);
  }

  @Get('youtube/hashtag')
  youtubeHashtag(
    @Query('name') name: string,
    @Query('depth') depth?: string,
  ) {
    return this.trendsService.youtubeHashtag(name, depth);
  }
}
