import { Module } from '@nestjs/common';
import { RoomTypeController } from './controllers/room-type.controller';
import { RoomController } from './controllers/room.controller';
import { RoomBookingController } from './controllers/room-booking.controller';
import { RoomTypeService } from './services/room-type.service';
import { RoomService } from './services/room.service';
import { RoomBookingService } from './services/room-booking.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [
    RoomTypeController,
    RoomController,
    RoomBookingController,
  ],
  providers: [
    RoomTypeService,
    RoomService,
    RoomBookingService,
    PrismaService,
  ],
})
export class RoomModule {}
