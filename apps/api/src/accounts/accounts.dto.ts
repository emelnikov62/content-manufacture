import { IsString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Network, AccountStatus } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  brandId: string;

  @IsEnum(Network)
  network: Network;

  @IsString()
  postproxyProfileId: string;

  @IsString()
  handle: string;

  @IsOptional()
  @IsInt()
  dailyPostLimit?: number;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsString()
  statusMessage?: string;

  @IsOptional()
  @IsInt()
  dailyPostLimit?: number;
}
