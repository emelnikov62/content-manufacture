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
  ) {
    return this.trendsService.tiktokKeyword(name, cursor, period, sorting);
  }

  @Get('tiktok/post')
  tiktokPostInfo(@Query('url') url: string) {
    return this.trendsService.tiktokPostInfo(url);
  }

  @Get('instagram/search')
  instagramSearch(@Query('keyword') keyword: string) {
    return this.trendsService.instagramSearch(keyword);
  }

  @Get('instagram/reels')
  instagramUserReels(
    @Query('username') username: string,
    @Query('depth') depth?: string,
  ) {
    return this.trendsService.instagramUserReels(username, depth);
  }

  @Get('instagram/user')
  instagramUserInfo(@Query('username') username: string) {
    return this.trendsService.instagramUserInfo(username);
  }

  @Get('instagram/post')
  instagramPostInfo(@Query('url') url: string) {
    return this.trendsService.instagramPostInfo(url);
  }

  @Get('youtube/keyword')
  youtubeKeyword(
    @Query('keyword') keyword: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.trendsService.youtubeKeyword(keyword, cursor);
  }

  @Get('youtube/hashtag')
  youtubeHashtag(
    @Query('hashtag') hashtag: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.trendsService.youtubeHashtag(hashtag, cursor);
  }
}
