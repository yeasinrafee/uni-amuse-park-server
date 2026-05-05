import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUnifiedBookingDto } from './dto/unified-booking.dto';
import {
  DiscountType,
  PaymentStatus,
  IdentificationType,
  PaymentMethod,
  UnifiedBookingStatus,
} from 'src/generated/prisma/enums';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  constructor(private prisma: PrismaService) {}

  async createUnifiedBooking(dto: CreateUnifiedBookingDto) {
    const {
      ticketItems,
      restaurantItems,
      roomBookings,
      customerName,
      customerPhone,
      customerEmail,
      customerIdentificationType,
      customerIdentificationNumber,
      userId,
      staffId,
      paymentMethod,
      paidAmount = 0,
    } = dto;

    this.logger.log(`Creating unified booking for ${customerName}. PaidAmount in DTO: ${paidAmount}`);
    return this.prisma.$transaction(async (tx) => {
      // 1. Create UnifiedBooking placeholder first to get an ID
      // We'll update the totalAmount and paidAmount later
      const unifiedBooking = await tx.unifiedBooking.create({
        data: {
          totalAmount: 0,
          paidAmount: 0,
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod,
          customerName,
          customerPhone,
          userId,
          staffId,
        },
      });

      let calculatedTotalAmount = 0;
      let ticketBookingResult: any = null;
      let restaurantOrderResult: any = null;
      let roomBookingResults: any[] = [];

      // 2. Handle Tickets
      if (ticketItems && ticketItems.length > 0) {
        const ticketTypeIds = ticketItems.map((item) => item.ticketTypeId);
        const ticketTypes = await tx.ticketType.findMany({
          where: { id: { in: ticketTypeIds }, deletedAt: null },
        });

        if (ticketTypes.length !== ticketItems.length) {
          throw new NotFoundException('One or more ticket types not found');
        }

        const ticketBookingDetails = ticketItems.map((item) => {
          const type = ticketTypes.find((t) => t.id === item.ticketTypeId);
          return {
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            price: type!.price,
          };
        });

        const ticketTotal = ticketBookingDetails.reduce(
          (sum, d) => sum + d.price * d.quantity,
          0,
        );
        calculatedTotalAmount += ticketTotal;

        ticketBookingResult = await tx.ticketBooking.create({
          data: {
            customerName,
            customerPhone,
            staffId,
            userId,
            totalAmount: ticketTotal,
            unifiedBookingId: unifiedBooking.id,
            bookingDetails: {
              create: ticketBookingDetails,
            },
          },
          include: { bookingDetails: true },
        });
      }

      // 3. Handle Restaurant
      if (restaurantItems && restaurantItems.length > 0) {
        const itemIds = restaurantItems.map((i) => i.itemId);
        const dbItems = await tx.item.findMany({
          where: { id: { in: itemIds }, deletedAt: null },
        });

        if (dbItems.length !== itemIds.length) {
          throw new NotFoundException('One or more restaurant items not found');
        }

        const itemMap = new Map(dbItems.map((i) => [i.id, i]));
        let restaurantBaseAmount = 0;

        const orderItemsToCreate = restaurantItems.map((ri) => {
          const item = itemMap.get(ri.itemId)!;
          const subTotal = item.price * ri.quantity;
          let total = subTotal;

          const itemDiscountAmount = ri.discountAmount || 0;
          const itemDiscountType = ri.discountType || DiscountType.NONE;

          if (itemDiscountType === DiscountType.FLAT_DISCOUNT) {
            total = Math.max(0, subTotal - itemDiscountAmount);
          } else if (itemDiscountType === DiscountType.PERCENTAGE_DISCOUNT) {
            total = subTotal - subTotal * (itemDiscountAmount / 100);
          }

          restaurantBaseAmount += total;

          return {
            itemId: ri.itemId,
            quantity: ri.quantity,
            itemPrice: item.price,
            itemName: item.name,
            discountAmount: itemDiscountAmount,
            discountType: itemDiscountType,
            subTotal,
            total,
          };
        });

        let restaurantTotalAmount = restaurantBaseAmount;
        const resDiscountAmount = dto.restaurantDiscountAmount || 0;
        const resDiscountType = dto.restaurantDiscountType || DiscountType.NONE;

        if (resDiscountType === DiscountType.FLAT_DISCOUNT) {
          restaurantTotalAmount = Math.max(0, restaurantBaseAmount - resDiscountAmount);
        } else if (resDiscountType === DiscountType.PERCENTAGE_DISCOUNT) {
          restaurantTotalAmount = restaurantBaseAmount - restaurantBaseAmount * (resDiscountAmount / 100);
        }

        calculatedTotalAmount += restaurantTotalAmount;

        restaurantOrderResult = await tx.restaurantOrder.create({
          data: {
            customerName,
            customerPhone,
            staffId,
            baseAmount: restaurantBaseAmount,
            totalAmount: restaurantTotalAmount,
            paidAmount: 0,
            paymentStatus: PaymentStatus.UNPAID,
            discountAmount: resDiscountAmount,
            discountType: resDiscountType,
            unifiedBookingId: unifiedBooking.id,
            orderItems: {
              create: orderItemsToCreate,
            },
          },
          include: { orderItems: true },
        });
      }

      // 4. Handle Rooms
      if (roomBookings && roomBookings.length > 0) {
        for (const rb of roomBookings) {
          const room = await tx.room.findFirst({
            where: { id: rb.roomId, deletedAt: null, isUnderMaintenance: false },
          });

          if (!room) {
            throw new NotFoundException(`Room ${rb.roomId} not found or unavailable`);
          }

          const overlapping = await tx.roomBooking.findMany({
            where: {
              roomId: rb.roomId,
              status: { in: ['PENDING', 'CONFIRMED'] },
              AND: [
                { checkinDate: { lt: new Date(rb.checkoutDate) } },
                { checkoutDate: { gt: new Date(rb.checkinDate) } },
              ],
            },
          });

          if (overlapping.length > 0) {
            throw new BadRequestException(`Room ${room.roomNumber} is not available for the selected dates`);
          }

          calculatedTotalAmount += rb.totalAmount;

          const createdRoomBooking = await tx.roomBooking.create({
            data: {
              customerName: customerName || 'N/A',
              customerPhone: customerPhone || 'N/A',
              customerEmail,
              customerIdentificationType: customerIdentificationType || IdentificationType.NID,
              customerIdentificationNumber: customerIdentificationNumber || 'N/A',
              userId,
              roomId: rb.roomId,
              checkinDate: new Date(rb.checkinDate),
              checkoutDate: new Date(rb.checkoutDate),
              totalAmount: rb.totalAmount,
              paidAmount: 0,
              paymentStatus: PaymentStatus.UNPAID,
              paymentMethod,
              unifiedBookingId: unifiedBooking.id,
            },
          });
          roomBookingResults.push(createdRoomBooking);
        }
      }

      // 5. Update UnifiedBooking with correct totals and distribute paidAmount
      let remainingPaid = paidAmount;
      const paymentPercentage = calculatedTotalAmount > 0 ? (remainingPaid / calculatedTotalAmount) * 100 : 0;
      const finalPaymentStatus = paymentPercentage >= 100 
        ? PaymentStatus.PAID 
        : (paymentPercentage >= 25 
            ? PaymentStatus.PARTIALLY_PAID 
            : (paymentPercentage > 0 ? (PaymentStatus as any).DUE : PaymentStatus.UNPAID));

      const finalStatus = remainingPaid >= calculatedTotalAmount && calculatedTotalAmount > 0
        ? UnifiedBookingStatus.CONFIRMED
        : UnifiedBookingStatus.PENDING;

      const updatedUnifiedBooking = await tx.unifiedBooking.update({
        where: { id: unifiedBooking.id },
        data: {
          totalAmount: calculatedTotalAmount,
          paidAmount: remainingPaid,
          paymentStatus: finalPaymentStatus,
          status: finalStatus,
        },
      });

      // Distribute payment to sub-entities
      if (ticketBookingResult && remainingPaid > 0) {
        const amountToPay = Math.min(remainingPaid, ticketBookingResult.totalAmount);
        ticketBookingResult = await tx.ticketBooking.update({
          where: { id: ticketBookingResult.id },
          data: {
            status: amountToPay >= ticketBookingResult.totalAmount ? 'CONFIRMED' : 'PENDING'
          },
          include: { bookingDetails: true },
        });
        remainingPaid -= amountToPay;
      }

      if (restaurantOrderResult && remainingPaid > 0) {
        const amountToPay = Math.min(remainingPaid, restaurantOrderResult.totalAmount);
        const subStatus = amountToPay >= restaurantOrderResult.totalAmount ? PaymentStatus.PAID : (amountToPay > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID);
        restaurantOrderResult = await tx.restaurantOrder.update({
          where: { id: restaurantOrderResult.id },
          data: {
            paidAmount: amountToPay,
            paymentStatus: subStatus
          },
          include: { orderItems: true },
        });
        remainingPaid -= amountToPay;
      }

      const updatedRoomBookingResults: any[] = [];
      for (let rb of roomBookingResults) {
        let amountToPay = 0;
        if (remainingPaid > 0) {
          amountToPay = Math.min(remainingPaid, rb.totalAmount);
          remainingPaid -= amountToPay;
        }
        
        const subStatus = amountToPay >= rb.totalAmount ? PaymentStatus.PAID : (amountToPay > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID);
        const updatedRb = await tx.roomBooking.update({
          where: { id: rb.id },
          data: {
            paidAmount: amountToPay,
            paymentStatus: subStatus,
            status: amountToPay > 0 ? 'CONFIRMED' : 'PENDING'
          },
          include: { room: { include: { roomType: true } } }
        });
        updatedRoomBookingResults.push(updatedRb);
      }
      roomBookingResults = updatedRoomBookingResults;

      return {
        id: updatedUnifiedBooking.id,
        ticketBooking: ticketBookingResult,
        restaurantOrder: restaurantOrderResult,
        roomBookings: roomBookingResults,
        totalAmount: calculatedTotalAmount,
        paidAmount,
        paymentStatus: finalPaymentStatus,
        status: finalStatus,
      };
    });
  }

  async findAll() {
    return this.prisma.unifiedBooking.findMany({
      include: {
        ticketBookings: {
          include: {
            bookingDetails: {
              include: { ticketType: true }
            }
          }
        },
        restaurantOrders: {
          include: {
            orderItems: {
              include: { item: true }
            }
          }
        },
        roomBookings: {
          include: {
            room: {
              include: { roomType: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async processPayment(id: string, amount: number, method?: PaymentMethod, transactionId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const unified = await tx.unifiedBooking.findUnique({
        where: { id },
        include: {
          ticketBookings: true,
          restaurantOrders: true,
          roomBookings: true,
        }
      });

      if (!unified) throw new NotFoundException('Booking not found');

      // If this transaction ID was already processed, skip
      if (transactionId && unified.transactionId === transactionId) {
        this.logger.log(`Transaction ${transactionId} already processed for booking ${id}. Skipping.`);
        return unified;
      }

      // Prevent duplicate processing if already paid
      if (unified.paymentStatus === PaymentStatus.PAID) {
        return unified;
      }

      const remainingBalance = Number((unified.totalAmount - unified.paidAmount).toFixed(2));
      const amountToApply = Math.min(amount, remainingBalance);
      const newPaidAmount = Number((unified.paidAmount + amountToApply).toFixed(2));

      const paymentPercentage = (newPaidAmount / unified.totalAmount) * 100;
      const newStatus = paymentPercentage >= 100 
        ? PaymentStatus.PAID 
        : (paymentPercentage >= 25 
            ? PaymentStatus.PARTIALLY_PAID 
            : (paymentPercentage > 0 ? (PaymentStatus as any).DUE : PaymentStatus.UNPAID));

      this.logger.log(`Processing payment for ${id}: Total=${unified.totalAmount}, AlreadyPaid=${unified.paidAmount}, NewPayment=${amount}, Applied=${amountToApply}, ResultPaid=${newPaidAmount}, Status=${newStatus}`);

      // Update Unified Booking
      const updatedUnified = await tx.unifiedBooking.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newStatus,
          transactionId: transactionId,
          status: UnifiedBookingStatus.CONFIRMED, // Mark as confirmed when payment is received
          ...(method && { paymentMethod: method })
        }
      });

      // Redistribute total paid amount to sub-entities
      let remainingToDistribute = newPaidAmount;

      for (let t of unified.ticketBookings) {
        const pay = Math.min(remainingToDistribute, t.totalAmount);
        await tx.ticketBooking.update({
          where: { id: t.id },
          data: { status: pay >= t.totalAmount ? 'CONFIRMED' : 'PENDING' }
        });
        remainingToDistribute -= pay;
      }

      for (let r of unified.restaurantOrders) {
        const pay = Math.min(remainingToDistribute, r.totalAmount);
        const subStatus = pay >= r.totalAmount ? PaymentStatus.PAID : (pay > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID);
        await tx.restaurantOrder.update({
          where: { id: r.id },
          data: { paidAmount: pay, paymentStatus: subStatus }
        });
        remainingToDistribute -= pay;
      }

      for (let rm of unified.roomBookings) {
        const pay = Math.min(remainingToDistribute, rm.totalAmount);
        const subStatus = pay >= rm.totalAmount ? PaymentStatus.PAID : (pay > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID);
        await tx.roomBooking.update({
          where: { id: rm.id },
          data: { 
            paidAmount: pay, 
            paymentStatus: subStatus,
            status: pay > 0 ? 'CONFIRMED' : 'PENDING' 
          }
        });
        remainingToDistribute -= pay;
      }

      return updatedUnified;
    });
  }

  async cancelUnifiedBooking(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const unified = await tx.unifiedBooking.findUnique({
        where: { id },
        include: {
          ticketBookings: true,
          restaurantOrders: true,
          roomBookings: true,
        },
      });

      if (!unified) throw new NotFoundException('Booking not found');

      if (unified.paymentStatus !== PaymentStatus.UNPAID) {
        throw new BadRequestException('Only unpaid bookings can be cancelled');
      }

      // Update parent status
      await tx.unifiedBooking.update({
        where: { id: id },
        data: { status: 'CANCELLED' },
      });

      // Cancel sub-bookings
      for (let t of unified.ticketBookings) {
        await tx.ticketBooking.update({
          where: { id: t.id },
          data: { status: 'CANCELLED' },
        });
      }

      for (let r of unified.restaurantOrders) {
        await tx.restaurantOrder.update({
          where: { id: r.id },
          data: { status: 'CANCELLED' },
        });
      }

      for (let rm of unified.roomBookings) {
        await tx.roomBooking.update({
          where: { id: rm.id },
          data: { status: 'CANCELLED' },
        });
      }

      return { message: 'Booking cancelled successfully' };
    });
  }
}
