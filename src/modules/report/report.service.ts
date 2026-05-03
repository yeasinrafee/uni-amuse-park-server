import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(query: ReportQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Set endDate to the end of the day (23:59:59.999)
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    return { startDate, endDate };
  }

  // ──────────────────────────────────────────────
  //  TICKET REPORT
  // ──────────────────────────────────────────────

  async getTicketReport(query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const whereClause: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.status) {
      whereClause.status = query.status;
    }

    // 1. All bookings within date range with full details
    const bookings = await this.prisma.ticketBooking.findMany({
      where: whereClause,
      include: {
        bookingDetails: {
          include: { ticketType: true },
        },
        user: {
          select: { userId: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Aggregate summary
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTicketsSold = bookings.reduce(
      (sum, b) =>
        sum + b.bookingDetails.reduce((s, d) => s + d.quantity, 0),
      0,
    );

    // 3. Status breakdown
    const statusBreakdown = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 4. Revenue by status
    const revenueByStatus = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + b.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 5. Per-ticket-type breakdown
    const ticketTypeMap: Record<
      string,
      { name: string; totalQuantity: number; totalRevenue: number }
    > = {};

    for (const booking of bookings) {
      for (const detail of booking.bookingDetails) {
        const key = detail.ticketTypeId;
        if (!ticketTypeMap[key]) {
          ticketTypeMap[key] = {
            name: detail.ticketType?.name || 'Unknown',
            totalQuantity: 0,
            totalRevenue: 0,
          };
        }
        ticketTypeMap[key].totalQuantity += detail.quantity;
        ticketTypeMap[key].totalRevenue += detail.price * detail.quantity;
      }
    }

    const ticketTypeBreakdown = Object.entries(ticketTypeMap)
      .map(([id, data]) => ({
        ticketTypeId: id,
        ...data,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 6. Daily breakdown
    const dailyMap: Record<
      string,
      { date: string; bookings: number; revenue: number; ticketsSold: number }
    > = {};

    for (const booking of bookings) {
      const dateKey = booking.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          bookings: 0,
          revenue: 0,
          ticketsSold: 0,
        };
      }
      dailyMap[dateKey].bookings += 1;
      dailyMap[dateKey].revenue += booking.totalAmount;
      dailyMap[dateKey].ticketsSold += booking.bookingDetails.reduce(
        (s, d) => s + d.quantity,
        0,
      );
    }

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    // 7. Average metrics
    const avgRevenuePerBooking =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const avgTicketsPerBooking =
      totalBookings > 0 ? totalTicketsSold / totalBookings : 0;

    return {
      reportType: 'TICKET',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalBookings,
        totalTicketsSold,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRevenuePerBooking: Math.round(avgRevenuePerBooking * 100) / 100,
        avgTicketsPerBooking: Math.round(avgTicketsPerBooking * 100) / 100,
      },
      statusBreakdown,
      revenueByStatus,
      ticketTypeBreakdown,
      dailyBreakdown,
    };
  }

  // ──────────────────────────────────────────────
  //  RESTAURANT REPORT
  // ──────────────────────────────────────────────

  async getRestaurantReport(query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const whereClause: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.status) {
      whereClause.status = query.status;
    }

    // 1. All orders within date range with full details
    const orders = await this.prisma.restaurantOrder.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: { item: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Aggregate summary
    const totalOrders = orders.length;
    const totalBaseAmount = orders.reduce((sum, o) => sum + o.baseAmount, 0);
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaidAmount = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalDueAmount = totalRevenue - totalPaidAmount;
    const totalDiscount = totalBaseAmount - totalRevenue;
    const totalItemsSold = orders.reduce(
      (sum, o) => sum + o.orderItems.reduce((s, oi) => s + oi.quantity, 0),
      0,
    );

    // 3. Payment status breakdown
    const paymentStatusBreakdown = orders.reduce(
      (acc, o) => {
        acc[o.paymentStatus] = (acc[o.paymentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 4. Order status breakdown
    const orderStatusBreakdown = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 5. Revenue by payment status
    const revenueByPaymentStatus = orders.reduce(
      (acc, o) => {
        acc[o.paymentStatus] = (acc[o.paymentStatus] || 0) + o.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 6. Top selling items
    const itemMap: Record<
      string,
      {
        itemId: string;
        itemName: string;
        totalQuantity: number;
        totalRevenue: number;
      }
    > = {};

    for (const order of orders) {
      for (const oi of order.orderItems) {
        const key = oi.itemId;
        if (!itemMap[key]) {
          itemMap[key] = {
            itemId: oi.itemId,
            itemName: oi.itemName,
            totalQuantity: 0,
            totalRevenue: 0,
          };
        }
        itemMap[key].totalQuantity += oi.quantity;
        itemMap[key].totalRevenue += oi.total;
      }
    }

    const topSellingItems = Object.values(itemMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // 7. Daily breakdown
    const dailyMap: Record<
      string,
      {
        date: string;
        orders: number;
        revenue: number;
        paidAmount: number;
        dueAmount: number;
        itemsSold: number;
      }
    > = {};

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          orders: 0,
          revenue: 0,
          paidAmount: 0,
          dueAmount: 0,
          itemsSold: 0,
        };
      }
      dailyMap[dateKey].orders += 1;
      dailyMap[dateKey].revenue += order.totalAmount;
      dailyMap[dateKey].paidAmount += order.paidAmount;
      dailyMap[dateKey].dueAmount +=
        order.totalAmount - order.paidAmount;
      dailyMap[dateKey].itemsSold += order.orderItems.reduce(
        (s, oi) => s + oi.quantity,
        0,
      );
    }

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    // 8. Discount analysis
    const ordersWithDiscount = orders.filter(
      (o) => o.discountType !== 'NONE' && (o.discountAmount ?? 0) > 0,
    );

    // 9. Average metrics
    const avgRevenuePerOrder =
      totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgItemsPerOrder =
      totalOrders > 0 ? totalItemsSold / totalOrders : 0;

    return {
      reportType: 'RESTAURANT',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalOrders,
        totalItemsSold,
        totalBaseAmount: Math.round(totalBaseAmount * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
        totalDueAmount: Math.round(totalDueAmount * 100) / 100,
        avgRevenuePerOrder: Math.round(avgRevenuePerOrder * 100) / 100,
        avgItemsPerOrder: Math.round(avgItemsPerOrder * 100) / 100,
        ordersWithDiscount: ordersWithDiscount.length,
      },
      paymentStatusBreakdown,
      orderStatusBreakdown,
      revenueByPaymentStatus,
      topSellingItems,
      dailyBreakdown,
    };
  }

  // ──────────────────────────────────────────────
  //  ROOM REPORT
  // ──────────────────────────────────────────────

  async getRoomReport(query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const whereClause: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.status) {
      whereClause.status = query.status;
    }

    // 1. All bookings within date range with full details
    const bookings = await this.prisma.roomBooking.findMany({
      where: whereClause,
      include: {
        room: {
          include: { roomType: true },
        },
        user: {
          select: { userId: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Aggregate summary
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPaidAmount = bookings.reduce((sum, b) => sum + b.paidAmount, 0);
    const totalDueAmount = totalRevenue - totalPaidAmount;

    // 3. Booking status breakdown
    const statusBreakdown = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 4. Payment status breakdown
    const paymentStatusBreakdown = bookings.reduce(
      (acc, b) => {
        acc[b.paymentStatus] = (acc[b.paymentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 5. Revenue by booking status
    const revenueByStatus = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + b.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 6. Revenue by payment status
    const revenueByPaymentStatus = bookings.reduce(
      (acc, b) => {
        acc[b.paymentStatus] = (acc[b.paymentStatus] || 0) + b.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 7. Payment method breakdown
    const paymentMethodBreakdown = bookings.reduce(
      (acc, b) => {
        const method = b.paymentMethod || 'NONE';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 8. Room type breakdown
    const roomTypeMap: Record<
      string,
      {
        roomTypeName: string;
        totalBookings: number;
        totalRevenue: number;
        totalPaidAmount: number;
      }
    > = {};

    for (const booking of bookings) {
      const roomTypeName = booking.room?.roomType?.name || 'Unknown';
      const roomTypeId = booking.room?.roomTypeId || 'unknown';
      if (!roomTypeMap[roomTypeId]) {
        roomTypeMap[roomTypeId] = {
          roomTypeName,
          totalBookings: 0,
          totalRevenue: 0,
          totalPaidAmount: 0,
        };
      }
      roomTypeMap[roomTypeId].totalBookings += 1;
      roomTypeMap[roomTypeId].totalRevenue += booking.totalAmount;
      roomTypeMap[roomTypeId].totalPaidAmount += booking.paidAmount;
    }

    const roomTypeBreakdown = Object.entries(roomTypeMap)
      .map(([id, data]) => ({
        roomTypeId: id,
        ...data,
        totalDueAmount:
          Math.round((data.totalRevenue - data.totalPaidAmount) * 100) / 100,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 9. Per-room breakdown
    const roomMap: Record<
      string,
      {
        roomNumber: string;
        roomTypeName: string;
        totalBookings: number;
        totalRevenue: number;
      }
    > = {};

    for (const booking of bookings) {
      const roomId = booking.roomId;
      if (!roomMap[roomId]) {
        roomMap[roomId] = {
          roomNumber: booking.room?.roomNumber || 'Unknown',
          roomTypeName: booking.room?.roomType?.name || 'Unknown',
          totalBookings: 0,
          totalRevenue: 0,
        };
      }
      roomMap[roomId].totalBookings += 1;
      roomMap[roomId].totalRevenue += booking.totalAmount;
    }

    const roomBreakdown = Object.entries(roomMap)
      .map(([id, data]) => ({
        roomId: id,
        ...data,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings);

    // 10. Daily breakdown
    const dailyMap: Record<
      string,
      {
        date: string;
        bookings: number;
        revenue: number;
        paidAmount: number;
        dueAmount: number;
      }
    > = {};

    for (const booking of bookings) {
      const dateKey = booking.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          bookings: 0,
          revenue: 0,
          paidAmount: 0,
          dueAmount: 0,
        };
      }
      dailyMap[dateKey].bookings += 1;
      dailyMap[dateKey].revenue += booking.totalAmount;
      dailyMap[dateKey].paidAmount += booking.paidAmount;
      dailyMap[dateKey].dueAmount +=
        booking.totalAmount - booking.paidAmount;
    }

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    // 11. Stay duration analysis
    const stayDurations = bookings.map((b) => {
      const checkin = new Date(b.checkinDate);
      const checkout = new Date(b.checkoutDate);
      const nights = Math.ceil(
        (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24),
      );
      return nights;
    });

    const totalNights = stayDurations.reduce((sum, n) => sum + n, 0);
    const avgStayDuration =
      stayDurations.length > 0 ? totalNights / stayDurations.length : 0;

    // 12. Average metrics
    const avgRevenuePerBooking =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    return {
      reportType: 'ROOM',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalBookings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
        totalDueAmount: Math.round(totalDueAmount * 100) / 100,
        avgRevenuePerBooking: Math.round(avgRevenuePerBooking * 100) / 100,
        avgStayDuration: Math.round(avgStayDuration * 100) / 100,
        totalNights,
      },
      statusBreakdown,
      paymentStatusBreakdown,
      revenueByStatus,
      revenueByPaymentStatus,
      paymentMethodBreakdown,
      roomTypeBreakdown,
      roomBreakdown,
      dailyBreakdown,
    };
  }

  // ──────────────────────────────────────────────
  //  COMBINED / OVERVIEW REPORT
  // ──────────────────────────────────────────────

  async getOverviewReport(query: ReportQueryDto) {
    const [ticketReport, restaurantReport, roomReport] = await Promise.all([
      this.getTicketReport(query),
      this.getRestaurantReport(query),
      this.getRoomReport(query),
    ]);

    const totalRevenue =
      ticketReport.summary.totalRevenue +
      restaurantReport.summary.totalRevenue +
      roomReport.summary.totalRevenue;

    const totalPaidAmount =
      restaurantReport.summary.totalPaidAmount +
      roomReport.summary.totalPaidAmount +
      ticketReport.summary.totalRevenue; // Ticket bookings don't have paidAmount

    const totalDueAmount =
      restaurantReport.summary.totalDueAmount +
      roomReport.summary.totalDueAmount;

    // Build combined daily breakdown
    const allDates = new Set<string>();
    ticketReport.dailyBreakdown.forEach((d) => allDates.add(d.date));
    restaurantReport.dailyBreakdown.forEach((d) => allDates.add(d.date));
    roomReport.dailyBreakdown.forEach((d) => allDates.add(d.date));

    const ticketDailyMap = new Map(
      ticketReport.dailyBreakdown.map((d) => [d.date, d]),
    );
    const restaurantDailyMap = new Map(
      restaurantReport.dailyBreakdown.map((d) => [d.date, d]),
    );
    const roomDailyMap = new Map(
      roomReport.dailyBreakdown.map((d) => [d.date, d]),
    );

    const combinedDailyBreakdown = Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        ticketRevenue: ticketDailyMap.get(date)?.revenue || 0,
        restaurantRevenue: restaurantDailyMap.get(date)?.revenue || 0,
        roomRevenue: roomDailyMap.get(date)?.revenue || 0,
        totalRevenue:
          (ticketDailyMap.get(date)?.revenue || 0) +
          (restaurantDailyMap.get(date)?.revenue || 0) +
          (roomDailyMap.get(date)?.revenue || 0),
      }));

    return {
      reportType: 'OVERVIEW',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
        totalDueAmount: Math.round(totalDueAmount * 100) / 100,
      },
      revenueBreakdown: {
        ticket: Math.round(ticketReport.summary.totalRevenue * 100) / 100,
        restaurant:
          Math.round(restaurantReport.summary.totalRevenue * 100) / 100,
        room: Math.round(roomReport.summary.totalRevenue * 100) / 100,
      },
      countBreakdown: {
        ticketBookings: ticketReport.summary.totalBookings,
        restaurantOrders: restaurantReport.summary.totalOrders,
        roomBookings: roomReport.summary.totalBookings,
      },
      combinedDailyBreakdown,
      ticketSummary: ticketReport.summary,
      restaurantSummary: restaurantReport.summary,
      roomSummary: roomReport.summary,
    };
  }
}
