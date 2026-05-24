import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { InitiateRefundDto } from './dto/initiate-refund.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import { RefundStatus } from 'src/generated/prisma/enums';

@Controller('refund')
export class RefundController {
  private readonly logger = new Logger(RefundController.name);

  constructor(private readonly refundService: RefundService) {}

  /**
   * POST /refund/initiate
   * Initiate and process refund immediately
   * - Calculates 80% of paid amount by default
   * - Creates refund record and marks as COMPLETED
   * - Returns refund details
   *
   * Request body:
   * {
   *   "unifiedBookingId": "uuid",
   *   "paymentMethod": "BKASH|NAGAD|ROCKET|UPAY|BANK|CASH",
   *   "refundPercentage": 80 (optional, default 80),
   *   "notes": "reason for refund" (optional)
   * }
   */
  @Post('initiate')
  async initiateRefund(
    @Body() initiateRefundDto: InitiateRefundDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: RefundResponseDto;
  }> {
    try {
      this.logger.log(
        `Initiating refund for booking: ${initiateRefundDto.unifiedBookingId} via ${initiateRefundDto.paymentMethod}`,
      );

      const refund = await this.refundService.initiateRefund(
        initiateRefundDto,
      );

      return {
        success: true,
        message: `Refund of ${refund.refundAmount} BDT (${refund.refundPercentage}% of ${refund.originalAmount} BDT) processed successfully via ${refund.paymentMethod}`,
        data: refund,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * GET /refund/:id
   * Get refund details by ID
   */
  @Get(':id')
  async getRefundById(
    @Param('id') refundId: string,
  ): Promise<{
    success: boolean;
    data: RefundResponseDto;
  }> {
    this.logger.log(`Fetching refund details: ${refundId}`);

    const refund = await this.refundService.getRefundById(refundId);

    return {
      success: true,
      data: refund,
    };
  }

  /**
   * GET /refund/booking/:unifiedBookingId
   * Get all refunds for a specific booking
   */
  @Get('booking/:unifiedBookingId')
  async getRefundsByBooking(
    @Param('unifiedBookingId') unifiedBookingId: string,
  ): Promise<{
    success: boolean;
    count: number;
    data: RefundResponseDto[];
  }> {
    this.logger.log(`Fetching refunds for booking: ${unifiedBookingId}`);

    const refunds =
      await this.refundService.getRefundsByBookingId(unifiedBookingId);

    return {
      success: true,
      count: refunds.length,
      data: refunds,
    };
  }

  /**
   * GET /refund/status/:status
   * Get all refunds by status
   */
  @Get('status/:status')
  async getRefundsByStatus(
    @Param('status') status: string,
  ): Promise<{
    success: boolean;
    count: number;
    data: RefundResponseDto[];
  }> {
    // Validate status parameter
    const validStatuses = Object.values(RefundStatus);
    if (!validStatuses.includes(status as RefundStatus)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    this.logger.log(`Fetching refunds with status: ${status}`);

    const refunds = await this.refundService.getRefundsByStatus(
      status as RefundStatus,
    );

    return {
      success: true,
      count: refunds.length,
      data: refunds,
    };
  }

  /**
   * PATCH /refund/:id/cancel
   * Cancel a refund
   */
  @Patch(':id/cancel')
  async cancelRefund(
    @Param('id') refundId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: RefundResponseDto;
  }> {
    try {
      this.logger.log(`Cancelling refund: ${refundId}`);

      const refund = await this.refundService.cancelRefund(refundId);

      return {
        success: true,
        message: 'Refund cancelled successfully',
        data: refund,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
