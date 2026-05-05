import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsOptional()
  status?: string;
}
