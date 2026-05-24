import { PaymentMethod, RefundStatus } from 'src/generated/prisma/enums';

export class RefundResponseDto {
  id!: string;
  unifiedBookingId!: string;
  originalAmount!: number;
  refundAmount!: number;
  refundPercentage!: number;
  paymentMethod!: PaymentMethod;
  status!: RefundStatus;
  refundTransactionId: string | null = null;
  notes: string | null = null;
  processedAt: Date | null = null;
  completedAt: Date | null = null;
  createdAt!: Date;
  updatedAt!: Date;
}
