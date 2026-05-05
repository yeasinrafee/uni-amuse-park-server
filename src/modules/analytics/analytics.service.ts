import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getUserStats(userId: string) {
    const [ticketBookings, roomBookings, unifiedBookings] = await Promise.all([
      this.prisma.ticketBooking.findMany({
        where: { userId },
        include: { bookingDetails: true },
      }),
      this.prisma.roomBooking.findMany({
        where: { userId },
        include: { room: true },
      }),
      this.prisma.unifiedBooking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalSpent =
      ticketBookings.reduce((sum, b) => sum + b.totalAmount, 0) +
      roomBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    const ticketCount = ticketBookings.reduce(
      (sum, b) =>
        sum + b.bookingDetails.reduce((s, d) => s + d.quantity, 0),
      0,
    );

    return {
      summary: {
        totalSpent,
        ticketCount,
        roomBookingCount: roomBookings.length,
        totalBookings: ticketBookings.length + roomBookings.length,
      },
      recentBookings: unifiedBookings,
      spendingBreakdown: {
        tickets: ticketBookings.reduce((sum, b) => sum + b.totalAmount, 0),
        rooms: roomBookings.reduce((sum, b) => sum + b.totalAmount, 0),
      },
    };
  }

  async getAdminStats() {
    const [
      totalTickets,
      totalRooms,
      totalRestaurantRevenue,
      recentUnified,
      roomOccupancy,
      popularItems,
    ] = await Promise.all([
      // Total Ticket Revenue
      this.prisma.ticketBooking.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Total Room Revenue
      this.prisma.roomBooking.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Total Restaurant Revenue
      this.prisma.restaurantOrder.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Recent Unified Bookings
      this.prisma.unifiedBooking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Room Occupancy
      this.prisma.room.count({
        where: {
          bookings: {
            some: {
              status: 'CONFIRMED',
              checkoutDate: { gte: new Date() },
            },
          },
        },
      }),
      // Popular Restaurant Items
      this.prisma.restaurantOrderDetails.groupBy({
        by: ['itemId', 'itemName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const totalRevenue =
      (totalTickets._sum.totalAmount || 0) +
      (totalRooms._sum.totalAmount || 0) +
      (totalRestaurantRevenue._sum.totalAmount || 0);

    const totalRoomsCount = await this.prisma.room.count();

    return {
      revenue: {
        total: totalRevenue,
        tickets: totalTickets._sum.totalAmount || 0,
        rooms: totalRooms._sum.totalAmount || 0,
        restaurant: totalRestaurantRevenue._sum.totalAmount || 0,
      },
      counts: {
        tickets: totalTickets._count.id,
        rooms: totalRooms._count.id,
        restaurantOrders: totalRestaurantRevenue._count.id,
      },
      occupancy: {
        bookedRooms: roomOccupancy,
        totalRooms: totalRoomsCount,
        rate: totalRoomsCount > 0 ? (roomOccupancy / totalRoomsCount) * 100 : 0,
      },
      popularItems,
      recentActivity: recentUnified,
    };
  }
}
