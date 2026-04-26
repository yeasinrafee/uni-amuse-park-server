import { IsString, IsOptional, IsNotEmpty, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { IdentificationType, PaymentMethod, PaymentStatus, RoomBookingStatus } from 'src/generated/prisma/enums';

export class CreateRoomBookingDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsEnum(IdentificationType)
  @IsNotEmpty()
  customerIdentificationType!: IdentificationType;

  @IsString()
  @IsNotEmpty()
  customerIdentificationNumber!: string;

  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsDateString()
  @IsNotEmpty()
  checkinDate!: string;

  @IsDateString()
  @IsNotEmpty()
  checkoutDate!: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsNumber()
  @IsNotEmpty()
  totalAmount!: number;

  @IsNumber()
  @IsOptional()
  paidAmount?: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}

export class UpdateRoomBookingStatusDto {
  @IsEnum(RoomBookingStatus)
  @IsNotEmpty()
  status!: RoomBookingStatus;
}

export class UpdateRoomBookingPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  paidAmount!: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}

export class CreateUserRoomBookingDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsEnum(IdentificationType)
  @IsNotEmpty()
  customerIdentificationType!: IdentificationType;

  @IsString()
  @IsNotEmpty()
  customerIdentificationNumber!: string;

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
