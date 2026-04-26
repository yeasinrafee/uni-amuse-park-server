import { IsString, IsOptional, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsBoolean()
  @IsOptional()
  isUnderMaintenance?: boolean;

  @IsString()
  @IsNotEmpty()
  roomTypeId!: string;
}

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isUnderMaintenance?: boolean;

  @IsString()
  @IsOptional()
  roomTypeId?: string;
}
