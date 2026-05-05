import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class InitPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerEmail!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  customerCity?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  // The booking/order ID from your system to track this payment
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}
