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
import { PostsService } from './posts.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePostDto, UpdatePostDto } from './posts.dto';
import { PostStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private postsService: PostsService,
    private schedulerService: SchedulerService,
  ) {}

  @Get()
  findAll(
    @Query('brandId') brandId: string,
    @Query('status') status?: PostStatus,
  ) {
    return this.postsService.findAllByBrand(brandId, status);
  }

  @Get('calendar')
  getCalendar(
    @Query('brandId') brandId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.postsService.getCalendarPosts(
      brandId,
      new Date(from),
      new Date(to),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreatePostDto, @CurrentUser('sub') userId: string) {
    const post = await this.postsService.create(dto, userId);

    if (post.scheduledAt) {
      await this.schedulerService.schedulePost(post.id, post.scheduledAt);
    }

    return post;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    const post = await this.postsService.update(id, dto);

    if (dto.scheduledAt !== undefined) {
      await this.schedulerService.cancelScheduledPost(id);
      if (dto.scheduledAt) {
        await this.schedulerService.schedulePost(id, new Date(dto.scheduledAt));
      }
    }

    return post;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.schedulerService.cancelScheduledPost(id);
    return this.postsService.delete(id);
  }
}
