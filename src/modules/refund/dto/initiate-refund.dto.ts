import { IsUUID, IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { PaymentMethod } from 'src/generated/prisma/enums';

export class InitiateRefundDto {
  @IsUUID()
  unifiedBookingId!: string;

  @IsEnum(PaymentMethod, {
    message: `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  refundPercentage?: number; // Default is 80% if not provided

  @IsOptional()
  @IsString()
  notes?: string; // Additional notes or reason for refund
}
