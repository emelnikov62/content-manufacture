import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus } from '@prisma/client';

export class CreatePostTargetDto {
  @IsString()
  accountId: string;

  @IsOptional()
  networkParams?: Record<string, unknown>;
}

export class CreatePostDto {
  @IsString()
  brandId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostTargetDto)
  targets: CreatePostTargetDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostTargetDto)
  targets?: CreatePostTargetDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}
