import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('publications')
export class PublicationsController {
  constructor(private publicationsService: PublicationsService) {}

  @Post(':postId/publish')
  publish(@Param('postId') postId: string) {
    return this.publicationsService.publishPost(postId);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    return this.publicationsService.retryPublication(id);
  }

  @Get('post/:postId')
  findByPost(@Param('postId') postId: string) {
    return this.publicationsService.findByPost(postId);
  }
}
