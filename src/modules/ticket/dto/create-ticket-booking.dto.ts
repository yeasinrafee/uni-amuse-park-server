import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTicketBookingDetailDto } from './create-ticket-booking-detail.dto';

export class CreateTicketBookingDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketBookingDetailDto)
  ticketItems!: CreateTicketBookingDetailDto[];
}
