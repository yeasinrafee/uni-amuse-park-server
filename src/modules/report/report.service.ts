import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(query: ReportQueryDto) {
    const [startYear, startMonth, startDay] = query.startDate.split('T')[0].split('-').map(Number);
    const [endYear, endMonth, endDay] = query.endDate.split('T')[0].split('-').map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    if (startDate > endDate) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    return { startDate, endDate };
  }

  // Refund amount helper — ALL completed refunds summed (no filter needed since query already filters)
  private getCompletedRefundAmount(refunds: any[]): number {
    if (!refunds || refunds.length === 0) return 0;
    return refunds.reduce((sum, r) => sum + (r.refundAmount ?? 0), 0);
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

    const bookings = await this.prisma.ticketBooking.findMany({
      where: whereClause,
      include: {
        bookingDetails: {
          include: { ticketType: true },
        },
        user: {
          select: { userId: true, name: true, email: true, phone: true },
        },
        unifiedBooking: {
          select: {
            transactionId: true,
            paymentStatus: true,
            paidAmount: true,
            totalAmount: true,
            refundedAmount: true,
            refunds: {
              where: { status: 'COMPLETED' },
              select: { refundAmount: true, refundPercentage: true, paymentMethod: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalBookings = bookings.length;

    // Gross revenue (before refunds)
    const grossRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    // Total refunded — use unifiedBooking.refundedAmount (already tracked accurately)
    // If unifiedBooking has multiple booking types, we take proportional share for tickets
    const totalRefunded = bookings.reduce((sum, b) => {
      if (!b.unifiedBooking) return sum;

      const completedRefunds = this.getCompletedRefundAmount(b.unifiedBooking.refunds ?? []);

      // If unifiedBooking covers only this ticket booking, use full refund amount
      // Otherwise take proportional share based on ticket amount vs total unified amount
      const unifiedTotal = b.unifiedBooking.totalAmount ?? b.totalAmount;
      const proportion = unifiedTotal > 0 ? b.totalAmount / unifiedTotal : 1;

      return sum + Math.round(completedRefunds * proportion * 100) / 100;
    }, 0);

    const totalRevenue = Math.max(0, grossRevenue - totalRefunded);

    const totalTicketsSold = bookings.reduce(
      (sum, b) => sum + b.bookingDetails.reduce((s, d) => s + d.quantity, 0),
      0,
    );

    const statusBreakdown = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenueByStatus = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + b.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

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
      .map(([id, data]) => ({ ticketTypeId: id, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const dailyMap: Record<
      string,
      { date: string; bookings: number; revenue: number; refunded: number; netRevenue: number; ticketsSold: number }
    > = {};

    for (const booking of bookings) {
      const dateKey = booking.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          bookings: 0,
          revenue: 0,
          refunded: 0,
          netRevenue: 0,
          ticketsSold: 0,
        };
      }

      const completedRefunds = this.getCompletedRefundAmount(booking.unifiedBooking?.refunds ?? []);
      const unifiedTotal = booking.unifiedBooking?.totalAmount ?? booking.totalAmount;
      const proportion = unifiedTotal > 0 ? booking.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;

      dailyMap[dateKey].bookings += 1;
      dailyMap[dateKey].revenue += booking.totalAmount;
      dailyMap[dateKey].refunded += refundAmount;
      dailyMap[dateKey].netRevenue += Math.max(0, booking.totalAmount - refundAmount);
      dailyMap[dateKey].ticketsSold += booking.bookingDetails.reduce(
        (s, d) => s + d.quantity,
        0,
      );
    }

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    const avgRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const avgTicketsPerBooking = totalBookings > 0 ? totalTicketsSold / totalBookings : 0;

    const transactions = bookings.map((b) => {
      const items = b.bookingDetails
        .map((d) => `${d.ticketType?.name || 'Ticket'} x ${d.quantity}`)
        .join(', ');
      const paymentStatus = b.unifiedBooking?.paymentStatus || 'PAID';
      const isPaid = paymentStatus === 'PAID';

      const completedRefunds = this.getCompletedRefundAmount(b.unifiedBooking?.refunds ?? []);
      const unifiedTotal = b.unifiedBooking?.totalAmount ?? b.totalAmount;
      const proportion = unifiedTotal > 0 ? b.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;

      const grossPaid = isPaid ? b.totalAmount : 0;
      const netPaid = Math.max(0, grossPaid - refundAmount);

      return {
        date: b.createdAt.toISOString().split('T')[0],
        trx_id: b.unifiedBooking?.transactionId || 'N/A',
        customerName: b.customerName || b.user?.name || 'N/A',
        cusNumber: b.customerPhone || b.user?.phone || 'N/A',
        email: b.user?.email || 'N/A',
        department: 'Ticket Booking',
        item: items,
        paymentStatus,
        due: isPaid ? 0 : b.totalAmount,
        partialPayment: 0,
        paid: netPaid,
        refunded: refundAmount,
        amount: b.totalAmount,
      };
    });

    return {
      reportType: 'TICKET',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalBookings,
        totalTicketsSold,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRevenuePerBooking: Math.round(avgRevenuePerBooking * 100) / 100,
        avgTicketsPerBooking: Math.round(avgTicketsPerBooking * 100) / 100,
      },
      statusBreakdown,
      revenueByStatus,
      ticketTypeBreakdown,
      dailyBreakdown,
      transactions,
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

    const orders = await this.prisma.restaurantOrder.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: { item: true },
        },
        unifiedBooking: {
          select: {
            transactionId: true,
            paidAmount: true,
            totalAmount: true,
            refundedAmount: true,
            refunds: {
              where: { status: 'COMPLETED' },
              select: { refundAmount: true, refundPercentage: true, paymentMethod: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;
    const totalBaseAmount = orders.reduce((sum, o) => sum + o.baseAmount, 0);
    const grossRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Calculate refunded amount per order using completed refunds
    const totalRefunded = orders.reduce((sum, o) => {
      const completedRefunds = this.getCompletedRefundAmount(o.unifiedBooking?.refunds ?? []);
      const unifiedTotal = o.unifiedBooking?.totalAmount ?? o.totalAmount;
      const proportion = unifiedTotal > 0 ? o.totalAmount / unifiedTotal : 1;
      return sum + Math.round(completedRefunds * proportion * 100) / 100;
    }, 0);

    const totalRevenue = Math.max(0, grossRevenue - totalRefunded);

    // paidAmount per order after refund deduction
    const totalPaidAmount = orders.reduce((sum, o) => {
      const completedRefunds = this.getCompletedRefundAmount(o.unifiedBooking?.refunds ?? []);
      const unifiedTotal = o.unifiedBooking?.totalAmount ?? o.totalAmount;
      const proportion = unifiedTotal > 0 ? o.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;
      return sum + Math.max(0, o.paidAmount - refundAmount);
    }, 0);

    const totalDueAmount = Math.max(0, totalRevenue - totalPaidAmount);
    const totalDiscount = totalBaseAmount - grossRevenue;

    const totalItemsSold = orders.reduce(
      (sum, o) => sum + o.orderItems.reduce((s, oi) => s + oi.quantity, 0),
      0,
    );

    const paymentStatusBreakdown = orders.reduce(
      (acc, o) => {
        acc[o.paymentStatus] = (acc[o.paymentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const orderStatusBreakdown = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenueByPaymentStatus = orders.reduce(
      (acc, o) => {
        acc[o.paymentStatus] = (acc[o.paymentStatus] || 0) + o.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const itemMap: Record<
      string,
      { itemId: string; itemName: string; totalQuantity: number; totalRevenue: number }
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

    const topSellingItems = Object.values(itemMap).sort(
      (a, b) => b.totalQuantity - a.totalQuantity,
    );

    const dailyMap: Record<
      string,
      {
        date: string;
        orders: number;
        revenue: number;
        refunded: number;
        netRevenue: number;
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
          refunded: 0,
          netRevenue: 0,
          paidAmount: 0,
          dueAmount: 0,
          itemsSold: 0,
        };
      }

      const completedRefunds = this.getCompletedRefundAmount(order.unifiedBooking?.refunds ?? []);
      const unifiedTotal = order.unifiedBooking?.totalAmount ?? order.totalAmount;
      const proportion = unifiedTotal > 0 ? order.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;
      const netPaid = Math.max(0, order.paidAmount - refundAmount);

      dailyMap[dateKey].orders += 1;
      dailyMap[dateKey].revenue += order.totalAmount;
      dailyMap[dateKey].refunded += refundAmount;
      dailyMap[dateKey].netRevenue += Math.max(0, order.totalAmount - refundAmount);
      dailyMap[dateKey].paidAmount += netPaid;
      dailyMap[dateKey].dueAmount += Math.max(0, order.totalAmount - refundAmount - netPaid);
      dailyMap[dateKey].itemsSold += order.orderItems.reduce((s, oi) => s + oi.quantity, 0);
    }

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    const ordersWithDiscount = orders.filter(
      (o) => o.discountType !== 'NONE' && (o.discountAmount ?? 0) > 0,
    );

    const avgRevenuePerOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgItemsPerOrder = totalOrders > 0 ? totalItemsSold / totalOrders : 0;

    const transactions = orders.map((o) => {
      const items = o.orderItems
        .map((oi) => `${oi.itemName} x ${oi.quantity}`)
        .join(', ');

      const completedRefunds = this.getCompletedRefundAmount(o.unifiedBooking?.refunds ?? []);
      const unifiedTotal = o.unifiedBooking?.totalAmount ?? o.totalAmount;
      const proportion = unifiedTotal > 0 ? o.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;
      const netPaid = Math.max(0, o.paidAmount - refundAmount);
      const netDue = Math.max(0, o.totalAmount - refundAmount - netPaid);

      let partialPayment = 0;
      let paid = 0;
      if (netPaid > 0 && netPaid < o.totalAmount - refundAmount) {
        partialPayment = netPaid;
      } else if (netPaid >= o.totalAmount - refundAmount && o.totalAmount > 0) {
        paid = netPaid;
      }

      return {
        date: o.createdAt.toISOString().split('T')[0],
        trx_id: o.unifiedBooking?.transactionId || 'N/A',
        customerName: o.customerName || 'N/A',
        cusNumber: o.customerPhone || 'N/A',
        email: 'N/A',
        department: 'Restaurant',
        item: items,
        paymentStatus: o.paymentStatus,
        due: netDue,
        partialPayment,
        paid,
        refunded: refundAmount,
        amount: o.totalAmount,
      };
    });

    return {
      reportType: 'RESTAURANT',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalOrders,
        totalItemsSold,
        totalBaseAmount: Math.round(totalBaseAmount * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
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
      transactions,
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

    const bookings = await this.prisma.roomBooking.findMany({
      where: whereClause,
      include: {
        room: {
          include: { roomType: true },
        },
        user: {
          select: { userId: true, name: true, email: true, phone: true },
        },
        unifiedBooking: {
          select: {
            transactionId: true,
            paidAmount: true,
            totalAmount: true,
            refundedAmount: true,
            refunds: {
              where: { status: 'COMPLETED' },
              select: { refundAmount: true, refundPercentage: true, paymentMethod: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalBookings = bookings.length;
    const grossRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    const totalRefunded = bookings.reduce((sum, b) => {
      const completedRefunds = this.getCompletedRefundAmount(b.unifiedBooking?.refunds ?? []);
      const unifiedTotal = b.unifiedBooking?.totalAmount ?? b.totalAmount;
      const proportion = unifiedTotal > 0 ? b.totalAmount / unifiedTotal : 1;
      return sum + Math.round(completedRefunds * proportion * 100) / 100;
    }, 0);

    const totalRevenue = Math.max(0, grossRevenue - totalRefunded);

    const totalPaidAmount = bookings.reduce((sum, b) => {
      const completedRefunds = this.getCompletedRefundAmount(b.unifiedBooking?.refunds ?? []);
      const unifiedTotal = b.unifiedBooking?.totalAmount ?? b.totalAmount;
      const proportion = unifiedTotal > 0 ? b.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;
      return sum + Math.max(0, b.paidAmount - refundAmount);
    }, 0);

    const totalDueAmount = Math.max(0, totalRevenue - totalPaidAmount);

    const statusBreakdown = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const paymentStatusBreakdown = bookings.reduce(
      (acc, b) => {
        acc[b.paymentStatus] = (acc[b.paymentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenueByStatus = bookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + b.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenueByPaymentStatus = bookings.reduce(
      (acc, b) => {
        acc[b.paymentStatus] = (acc[b.paymentStatus] || 0) + b.totalAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const paymentMethodBreakdown = bookings.reduce(
      (acc, b) => {
        const method = b.paymentMethod || 'NONE';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const roomTypeMap: Record<
      string,
      {
        roomTypeName: string;
        totalBookings: number;
        totalRevenue: number;
        totalRefunded: number;
        totalPaidAmount: number;
      }
    > = {};

    for (const booking of bookings) {
      const roomTypeName = booking.room?.roomType?.name || 'Unknown';
      const roomTypeId = booking.room?.roomTypeId || 'unknown';
      const completedRefunds = this.getCompletedRefundAmount(booking.unifiedBooking?.refunds ?? []);
      const unifiedTotal = booking.unifiedBooking?.totalAmount ?? booking.totalAmount;
      const proportion = unifiedTotal > 0 ? booking.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;

      if (!roomTypeMap[roomTypeId]) {
        roomTypeMap[roomTypeId] = {
          roomTypeName,
          totalBookings: 0,
          totalRevenue: 0,
          totalRefunded: 0,
          totalPaidAmount: 0,
        };
      }
      roomTypeMap[roomTypeId].totalBookings += 1;
      roomTypeMap[roomTypeId].totalRevenue += booking.totalAmount;
      roomTypeMap[roomTypeId].totalRefunded += refundAmount;
      roomTypeMap[roomTypeId].totalPaidAmount += Math.max(0, booking.paidAmount - refundAmount);
    }

    const roomTypeBreakdown = Object.entries(roomTypeMap)
      .map(([id, data]) => ({
        roomTypeId: id,
        ...data,
        netRevenue: Math.round((data.totalRevenue - data.totalRefunded) * 100) / 100,
        totalDueAmount: Math.round(
          Math.max(0, data.totalRevenue - data.totalRefunded - data.totalPaidAmount) * 100,
        ) / 100,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const roomMap: Record<
      string,
      { roomNumber: string; roomTypeName: string; totalBookings: number; totalRevenue: number }
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
      .map(([id, data]) => ({ roomId: id, ...data }))
      .sort((a, b) => b.totalBookings - a.totalBookings);

    const dailyMap: Record<
      string,
      {
        date: string;
        bookings: number;
        revenue: number;
        refunded: number;
        netRevenue: number;
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
          refunded: 0,
          netRevenue: 0,
          paidAmount: 0,
          dueAmount: 0,
        };
      }

      const completedRefunds = this.getCompletedRefundAmount(booking.unifiedBooking?.refunds ?? []);
      const unifiedTotal = booking.unifiedBooking?.totalAmount ?? booking.totalAmount;
      const proportion = unifiedTotal > 0 ? booking.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;
      const netPaid = Math.max(0, booking.paidAmount - refundAmount);

      dailyMap[dateKey].bookings += 1;
      dailyMap[dateKey].revenue += booking.totalAmount;
      dailyMap[dateKey].refunded += refundAmount;
      dailyMap[dateKey].netRevenue += Math.max(0, booking.totalAmount - refundAmount);
      dailyMap[dateKey].paidAmount += netPaid;
      dailyMap[dateKey].dueAmount += Math.max(0, booking.totalAmount - refundAmount - netPaid);
    }

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    const stayDurations = bookings.map((b) => {
      const checkin = new Date(b.checkinDate);
      const checkout = new Date(b.checkoutDate);
      return Math.ceil(
        (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24),
      );
    });

    const totalNights = stayDurations.reduce((sum, n) => sum + n, 0);
    const avgStayDuration = stayDurations.length > 0 ? totalNights / stayDurations.length : 0;
    const avgRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const transactions = bookings.map((b) => {
      const items = `${b.room?.roomType?.name || 'Room'} (${b.room?.roomNumber || 'Unknown'})`;

      const completedRefunds = this.getCompletedRefundAmount(b.unifiedBooking?.refunds ?? []);
      const unifiedTotal = b.unifiedBooking?.totalAmount ?? b.totalAmount;
      const proportion = unifiedTotal > 0 ? b.totalAmount / unifiedTotal : 1;
      const refundAmount = Math.round(completedRefunds * proportion * 100) / 100;
      const netPaid = Math.max(0, b.paidAmount - refundAmount);
      const netDue = Math.max(0, b.totalAmount - refundAmount - netPaid);

      let partialPayment = 0;
      let paid = 0;
      if (netPaid > 0 && netPaid < b.totalAmount - refundAmount) {
        partialPayment = netPaid;
      } else if (netPaid >= b.totalAmount - refundAmount && b.totalAmount > 0) {
        paid = netPaid;
      }

      return {
        date: b.createdAt.toISOString().split('T')[0],
        trx_id: b.unifiedBooking?.transactionId || 'N/A',
        customerName: b.customerName || b.user?.name || 'N/A',
        cusNumber: b.customerPhone || b.user?.phone || 'N/A',
        email: b.customerEmail || b.user?.email || 'N/A',
        department: 'Hotel Room',
        item: items,
        paymentStatus: b.paymentStatus,
        due: netDue,
        partialPayment,
        paid,
        refunded: refundAmount,
        amount: b.totalAmount,
      };
    });

    return {
      reportType: 'ROOM',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        totalBookings,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
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
      transactions,
    };
  }

  // ──────────────────────────────────────────────
  //  OVERVIEW REPORT
  // ──────────────────────────────────────────────

  async getOverviewReport(query: ReportQueryDto) {
    const [ticketReport, restaurantReport, roomReport] = await Promise.all([
      this.getTicketReport(query),
      this.getRestaurantReport(query),
      this.getRoomReport(query),
    ]);

    const grossRevenue =
      ticketReport.summary.grossRevenue +
      restaurantReport.summary.grossRevenue +
      roomReport.summary.grossRevenue;

    const totalRefunded =
      ticketReport.summary.totalRefunded +
      restaurantReport.summary.totalRefunded +
      roomReport.summary.totalRefunded;

    const totalRevenue =
      ticketReport.summary.totalRevenue +
      restaurantReport.summary.totalRevenue +
      roomReport.summary.totalRevenue;

    const totalPaidAmount =
      restaurantReport.summary.totalPaidAmount +
      roomReport.summary.totalPaidAmount +
      ticketReport.summary.totalRevenue;

    const totalDueAmount =
      restaurantReport.summary.totalDueAmount +
      roomReport.summary.totalDueAmount;

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
      .map((date) => {
        const ticketDay = ticketDailyMap.get(date) as any;
        const restaurantDay = restaurantDailyMap.get(date) as any;
        const roomDay = roomDailyMap.get(date) as any;

        return {
          date,
          ticketRevenue: ticketDay?.revenue || 0,
          restaurantRevenue: restaurantDay?.revenue || 0,
          roomRevenue: roomDay?.revenue || 0,
          totalGrossRevenue:
            (ticketDay?.revenue || 0) +
            (restaurantDay?.revenue || 0) +
            (roomDay?.revenue || 0),
          totalRefunded:
            (ticketDay?.refunded || 0) +
            (restaurantDay?.refunded || 0) +
            (roomDay?.refunded || 0),
          totalRevenue:
            (ticketDay?.netRevenue || 0) +
            (restaurantDay?.netRevenue || 0) +
            (roomDay?.netRevenue || 0),
        };
      });

    const combinedTransactions = [
      ...ticketReport.transactions,
      ...restaurantReport.transactions,
      ...roomReport.transactions,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      reportType: 'OVERVIEW',
      period: { startDate: query.startDate, endDate: query.endDate },
      summary: {
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
        totalDueAmount: Math.round(totalDueAmount * 100) / 100,
      },
      revenueBreakdown: {
        ticket: Math.round(ticketReport.summary.totalRevenue * 100) / 100,
        restaurant: Math.round(restaurantReport.summary.totalRevenue * 100) / 100,
        room: Math.round(roomReport.summary.totalRevenue * 100) / 100,
      },
      countBreakdown: {
        ticketBookings: ticketReport.summary.totalBookings,
        restaurantOrders: restaurantReport.summary.totalOrders,
        roomBookings: roomReport.summary.totalBookings,
      },
      combinedDailyBreakdown,
      transactions: combinedTransactions,
      ticketSummary: ticketReport.summary,
      restaurantSummary: restaurantReport.summary,
      roomSummary: roomReport.summary,
    };
  }
}