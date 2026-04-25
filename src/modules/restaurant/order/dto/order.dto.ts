import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, PaymentStatus } from 'src/generated/prisma/enums';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems!: OrderItemDto[];

  @IsNumber()
  @IsOptional()
  paidAmount?: number;
}

export class UpdateOrderPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  paidAmount!: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}

export class CreateUserOrderDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems!: OrderItemDto[];
}
