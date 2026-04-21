import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { CreateTicketBookingDto } from './dto/create-ticket-booking.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

import { UpdateTicketBookingStatusDto } from './dto/update-ticket-booking-status.dto';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async createTicketType(data: CreateTicketTypeDto) {
    return this.prisma.ticketType.create({
      data: {
        name: data.name,
        price: data.price,
        image: data.image,
      },
    });
  }

  async updateTicketType(id: string, data: UpdateTicketTypeDto) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
    });
    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    return this.prisma.ticketType.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.image && { image: data.image }),
      },
    });
  }

  async getAllTicketTypes() {
    return this.prisma.ticketType.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTicketBooking(data: CreateTicketBookingDto) {
    let customerName = data.customerName;
    let customerPhone = data.customerPhone;

    // If userId is provided, try to fetch customer details if they are missing
    if (data.userId && (!customerName || !customerPhone)) {
      const user = await this.prisma.user.findUnique({
        where: { userId: data.userId },
      });
      if (user) {
        customerName = customerName || user.name;
        customerPhone = customerPhone || user.phone;
      }
    }

    const ticketTypeIds = data.ticketItems.map((item) => item.ticketTypeId);
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: {
        id: { in: ticketTypeIds },
        deletedAt: null,
      },
    });

    if (ticketTypes.length !== data.ticketItems.length) {
      throw new NotFoundException('One or more ticket types were not found');
    }

    const bookingDetails = data.ticketItems.map((item) => {
      const ticketType = ticketTypes.find(
        (type) => type.id === item.ticketTypeId,
      );
      return {
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        price: ticketType!.price,
      };
    });

    const totalAmount = bookingDetails.reduce(
      (sum, detail) => sum + detail.price * detail.quantity,
      0,
    );

    return this.prisma.ticketBooking.create({
      data: {
        customerName,
        customerPhone,
        staffId: data.staffId,
        userId: data.userId,
        totalAmount,
        bookingDetails: {
          create: bookingDetails.map((detail) => ({
            ticketTypeId: detail.ticketTypeId,
            quantity: detail.quantity,
            price: detail.price,
          })),
        },
      },
      include: {
        bookingDetails: true,
        user: true,
      },
    });
  }

  async updateTicketBookingStatus(
    id: string,
    data: UpdateTicketBookingStatusDto,
  ) {
    const ticketBooking = await this.prisma.ticketBooking.findUnique({
      where: { id },
    });
    if (!ticketBooking) {
      throw new NotFoundException('Ticket booking not found');
    }

    return this.prisma.ticketBooking.update({
      where: { id },
      data: {
        status: data.status,
      },
    });
  }

  async getAllTicketBookings() {
    return this.prisma.ticketBooking.findMany({
      include: {
        bookingDetails: {
          include: {
            ticketType: true,
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingsByUserId(userId: string) {
    return this.prisma.ticketBooking.findMany({
      where: { userId },
      include: {
        bookingDetails: {
          include: {
            ticketType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTicketType(id: string) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
    });
    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    return this.prisma.ticketType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteTicketBooking(id: string) {
    const ticketBooking = await this.prisma.ticketBooking.findUnique({
      where: { id },
    });
    if (!ticketBooking) {
      throw new NotFoundException('Ticket booking not found');
    }

    return this.prisma.ticketBooking.delete({ where: { id } });
  }
}
