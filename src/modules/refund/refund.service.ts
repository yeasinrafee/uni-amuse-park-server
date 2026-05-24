import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { InitiateRefundDto } from './dto/initiate-refund.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import {
  PaymentMethod,
  RefundStatus,
  PaymentStatus,
} from 'src/generated/prisma/enums';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private readonly DEFAULT_REFUND_PERCENTAGE = 80;

  constructor(private prisma: PrismaService) {}

  async initiateRefund(dto: InitiateRefundDto): Promise<RefundResponseDto> {
    const {
      unifiedBookingId,
      paymentMethod,
      refundPercentage = this.DEFAULT_REFUND_PERCENTAGE,
      notes,
    } = dto;

    if (refundPercentage < 1 || refundPercentage > 100) {
      throw new BadRequestException(
        'Refund percentage must be between 1 and 100',
      );
    }

    const booking = await this.prisma.unifiedBooking.findUnique({
      where: { id: unifiedBookingId },
      include: {
        refunds: {
          where: { status: { not: RefundStatus.CANCELLED } },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(
        `Unified booking with ID ${unifiedBookingId} not found`,
      );
    }

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        `Booking payment status is ${booking.paymentStatus}. Only PAID bookings can be refunded.`,
      );
    }

    if (booking.paidAmount <= 0) {
      throw new BadRequestException('Booking has no paid amount to refund');
    }

    // 24-hour window check for customer bookings
    if (booking.userId) {
      const bookingCreatedTime = new Date(booking.createdAt).getTime();
      const currentTime = new Date().getTime();
      const timeDiffHours =
        (currentTime - bookingCreatedTime) / (1000 * 60 * 60);

      if (timeDiffHours > 24) {
        const hoursExceeded = Math.round(timeDiffHours - 24);
        throw new BadRequestException(
          `Refund window has expired. Bookings can only be refunded within 24 hours of creation. ` +
            `This booking was created ${Math.floor(timeDiffHours)} hours ago (${hoursExceeded} hours past the refund window).`,
        );
      }
    }

    // Check for existing active refund
    const existingRefund = booking.refunds.find(
      (r) =>
        r.status !== RefundStatus.CANCELLED && r.status !== RefundStatus.FAILED,
    );

    if (existingRefund) {
      throw new ConflictException(
        `A refund is already in progress for this booking. Current status: ${existingRefund.status}`,
      );
    }

    // Calculate refund amount
    const refundAmount =
      Math.round(((booking.paidAmount * refundPercentage) / 100) * 100) / 100;

    this.logger.log(
      `Initiating refund: BookingID=${unifiedBookingId}, ` +
        `OriginalAmount=${booking.paidAmount}, RefundPercentage=${refundPercentage}%, ` +
        `RefundAmount=${refundAmount}, PaymentMethod=${paymentMethod}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Create refund record
      const refund = await tx.refund.create({
        data: {
          unifiedBookingId,
          originalAmount: booking.paidAmount,
          refundAmount,
          refundPercentage,
          paymentMethod,
          status: RefundStatus.COMPLETED,
          refundTransactionId: this.generateTransactionId(paymentMethod),
          completedAt: new Date(),
          notes: notes || null,
        },
      });

      // Calculate new values for unified booking
      const newPaidAmount =
        Math.round((booking.paidAmount - refundAmount) * 100) / 100;

      const newRefundedAmount =
        Math.round(((booking.refundedAmount ?? 0) + refundAmount) * 100) / 100;

      const newPaymentStatus =
        newPaidAmount <= 0
          ? PaymentStatus.UNPAID
          : newPaidAmount < booking.totalAmount
            ? PaymentStatus.DUE
            : PaymentStatus.PAID;

      // Update unified booking with refund info
      await tx.unifiedBooking.update({
        where: { id: unifiedBookingId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          refundedAmount: newRefundedAmount,   // cumulative refunded total
          refundStatus: RefundStatus.COMPLETED, // latest refund status
        },
      });

      this.logger.log(
        `Refund completed: RefundID=${refund.id}, Amount=${refund.refundAmount} via ${paymentMethod}. ` +
          `UnifiedBooking updated: paidAmount=${newPaidAmount}, refundedAmount=${newRefundedAmount}`,
      );

      return this.mapRefundToResponseDto(refund);
    });
  }

  private generateTransactionId(paymentMethod: PaymentMethod): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const methodCode = paymentMethod.substring(0, 3).toUpperCase();
    return `${methodCode}-${timestamp}-${random}`;
  }

  async getRefundById(refundId: string): Promise<RefundResponseDto> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found`);
    }

    return this.mapRefundToResponseDto(refund);
  }

  async getRefundsByBookingId(
    unifiedBookingId: string,
  ): Promise<RefundResponseDto[]> {
    const refunds = await this.prisma.refund.findMany({
      where: { unifiedBookingId },
      orderBy: { createdAt: 'desc' },
    });

    if (refunds.length === 0) {
      this.logger.log(`No refunds found for booking ${unifiedBookingId}`);
    }

    return refunds.map((refund) => this.mapRefundToResponseDto(refund));
  }

  async getRefundsByStatus(
    status: RefundStatus,
  ): Promise<RefundResponseDto[]> {
    const refunds = await this.prisma.refund.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return refunds.map((refund) => this.mapRefundToResponseDto(refund));
  }

  async cancelRefund(refundId: string): Promise<RefundResponseDto> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.COMPLETED) {
      throw new BadRequestException(
        `Only COMPLETED refunds can be cancelled. Current status: ${refund.status}`,
      );
    }

    // Reverse the refundedAmount and refundStatus on the booking
    const booking = await this.prisma.unifiedBooking.findUnique({
      where: { id: refund.unifiedBookingId },
    });

    if (booking) {
      const restoredPaidAmount =
        Math.round((booking.paidAmount + refund.refundAmount) * 100) / 100;

      const newRefundedAmount = Math.max(
        0,
        Math.round(
          ((booking.refundedAmount ?? 0) - refund.refundAmount) * 100,
        ) / 100,
      );

      const restoredPaymentStatus =
        restoredPaidAmount >= booking.totalAmount
          ? PaymentStatus.PAID
          : restoredPaidAmount > 0
            ? PaymentStatus.DUE
            : PaymentStatus.UNPAID;

      await this.prisma.unifiedBooking.update({
        where: { id: refund.unifiedBookingId },
        data: {
          paidAmount: restoredPaidAmount,
          paymentStatus: restoredPaymentStatus,
          refundedAmount: newRefundedAmount,
          refundStatus: newRefundedAmount > 0 ? RefundStatus.COMPLETED : null,
        },
      });
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.CANCELLED },
    });

    this.logger.log(`Refund cancelled: RefundID=${refundId}`);

    return this.mapRefundToResponseDto(updatedRefund);
  }

  private mapRefundToResponseDto(refund: any): RefundResponseDto {
    return {
      id: refund.id,
      unifiedBookingId: refund.unifiedBookingId,
      originalAmount: refund.originalAmount,
      refundAmount: refund.refundAmount,
      refundPercentage: refund.refundPercentage,
      paymentMethod: refund.paymentMethod,
      status: refund.status,
      refundTransactionId: refund.refundTransactionId,
      notes: refund.notes,
      processedAt: refund.processedAt,
      completedAt: refund.completedAt,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }
}