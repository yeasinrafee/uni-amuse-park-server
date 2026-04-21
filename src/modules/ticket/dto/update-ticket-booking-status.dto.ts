import { TicketBookingStatus } from 'src/generated/prisma/enums';

export class UpdateTicketBookingStatusDto {
  status!: TicketBookingStatus;
}
