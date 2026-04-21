import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateTicketBookingDetailDto {
  @IsString()
  @IsNotEmpty()
  ticketTypeId!: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity!: number;
}
