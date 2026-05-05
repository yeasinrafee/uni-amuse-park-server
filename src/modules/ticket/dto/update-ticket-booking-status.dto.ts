import { IsEnum, IsNotEmpty } from 'class-validator';
import { TicketBookingStatus } from 'src/generated/prisma/enums';

export class UpdateTicketBookingStatusDto {
  @IsEnum(TicketBookingStatus)
  @IsNotEmpty()
  status!: TicketBookingStatus;
}
