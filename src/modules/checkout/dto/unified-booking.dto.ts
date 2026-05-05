import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DiscountType,
  IdentificationType,
  PaymentMethod,
  PaymentStatus,
} from 'src/generated/prisma/enums';

class UnifiedTicketItemDto {
  @IsString()
  @IsNotEmpty()
  ticketTypeId!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;
}

class UnifiedRestaurantItemDto {
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

class UnifiedRoomBookingDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsDateString()
  @IsNotEmpty()
  checkinDate!: string;

  @IsDateString()
  @IsNotEmpty()
  checkoutDate!: string;

  @IsNumber()
  @IsNotEmpty()
  totalAmount!: number;
}

export class CreateUnifiedBookingDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsEnum(IdentificationType)
  @IsOptional()
  customerIdentificationType?: IdentificationType;

  @IsString()
  @IsOptional()
  customerIdentificationNumber?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  staffId!: string;

  // Ticket Section
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UnifiedTicketItemDto)
  ticketItems?: UnifiedTicketItemDto[];

  // Restaurant Section
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UnifiedRestaurantItemDto)
  restaurantItems?: UnifiedRestaurantItemDto[];

  @IsNumber()
  @IsOptional()
  restaurantDiscountAmount?: number;

  @IsEnum(DiscountType)
  @IsOptional()
  restaurantDiscountType?: DiscountType;

  // Room Section
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UnifiedRoomBookingDto)
  roomBookings?: UnifiedRoomBookingDto[];

  // Global Payment Info (optional, can be split per section but user asked for one api hit)
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsNumber()
  @IsOptional()
  paidAmount?: number;
}
