import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateRoomBookingDto, CreateUserRoomBookingDto, UpdateRoomBookingStatusDto, UpdateRoomBookingPaymentDto } from '../dto/room-booking.dto';

@Injectable()
export class RoomBookingService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomBookingDto: CreateRoomBookingDto) {
    const { roomId, checkinDate, checkoutDate, ...bookingData } = createRoomBookingDto;

    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null, isUnderMaintenance: false },
    });

    if (!room) {
      throw new NotFoundException(`Available Room with ID ${roomId} not found`);
    }

    // Check for overlapping bookings
    const overlappingBookings = await this.prisma.roomBooking.findMany({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { checkinDate: { lt: new Date(checkoutDate) } },
          { checkoutDate: { gt: new Date(checkinDate) } }
        ]
      }
    });

    if (overlappingBookings.length > 0) {
      throw new BadRequestException('Room is not available for the selected dates');
    }

    let paymentStatus = bookingData.paymentStatus || 'UNPAID';
    const paidAmount = bookingData.paidAmount || 0;
    
    if (paidAmount >= bookingData.totalAmount && bookingData.totalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    return this.prisma.roomBooking.create({
      data: {
        ...bookingData,
        paidAmount,
        paymentStatus,
        roomId,
        checkinDate: new Date(checkinDate),
        checkoutDate: new Date(checkoutDate),
      },
      include: { room: { include: { roomType: true } } }
    });
  }

  async findAll() {
    return this.prisma.roomBooking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { room: { include: { roomType: true } } }
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.roomBooking.findUnique({
      where: { id },
      include: { room: { include: { roomType: true } } }
    });

    if (!booking) {
      throw new NotFoundException(`RoomBooking with ID ${id} not found`);
    }

    return booking;
  }

  async updateStatus(id: string, updateDto: UpdateRoomBookingStatusDto) {
    await this.findOne(id);
    return this.prisma.roomBooking.update({
      where: { id },
      data: { status: updateDto.status },
    });
  }

  async updatePayment(id: string, updateDto: UpdateRoomBookingPaymentDto) {
    const booking = await this.findOne(id);
    const newPaidAmount = updateDto.paidAmount;

    if (newPaidAmount > booking.totalAmount) {
      throw new BadRequestException(
        `Paid amount (${newPaidAmount}) cannot exceed total amount (${booking.totalAmount})`,
      );
    }

    let paymentStatus = updateDto.paymentStatus;
    if (!paymentStatus) {
      if (newPaidAmount >= booking.totalAmount && booking.totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'UNPAID';
      }
    }

    return this.prisma.roomBooking.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus,
        ...(updateDto.paymentMethod ? { paymentMethod: updateDto.paymentMethod } : {}),
      },
      include: { room: { include: { roomType: true } } }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.roomBooking.delete({
      where: { id },
    });
  }

  async getAvailableRooms(checkinDate: string, checkoutDate: string) {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);

    // Get all rooms that are NOT under maintenance and NOT deleted
    const allRooms = await this.prisma.room.findMany({
      where: { deletedAt: null, isUnderMaintenance: false },
      include: { roomType: true }
    });

    // Get overlapping bookings
    const overlappingBookings = await this.prisma.roomBooking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { checkinDate: { lt: checkout } },
          { checkoutDate: { gt: checkin } }
        ]
      }
    });

    const bookedRoomIds = new Set(overlappingBookings.map(b => b.roomId));

    // Filter available rooms
    return allRooms.filter(room => !bookedRoomIds.has(room.id));
  }

  async createByUser(createUserRoomBookingDto: CreateUserRoomBookingDto) {
    const { userId, roomId, checkinDate, checkoutDate, ...bookingData } = createUserRoomBookingDto;

    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null, isUnderMaintenance: false },
    });

    if (!room) {
      throw new NotFoundException(`Available Room with ID ${roomId} not found`);
    }

    // Check for overlapping bookings
    const overlappingBookings = await this.prisma.roomBooking.findMany({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { checkinDate: { lt: new Date(checkoutDate) } },
          { checkoutDate: { gt: new Date(checkinDate) } }
        ]
      }
    });

    if (overlappingBookings.length > 0) {
      throw new BadRequestException('Room is not available for the selected dates');
    }

    // User cannot pay at creation
    return this.prisma.roomBooking.create({
      data: {
        ...bookingData,
        userId,
        roomId,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
        checkinDate: new Date(checkinDate),
        checkoutDate: new Date(checkoutDate),
      },
      include: { room: { include: { roomType: true } } }
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.roomBooking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { room: { include: { roomType: true } } }
    });
  }
}
