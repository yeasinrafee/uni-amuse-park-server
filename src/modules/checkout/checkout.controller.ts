import { Controller, Post, Get, Patch, Body, Param, ParseFloatPipe } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateUnifiedBookingDto } from './dto/unified-booking.dto';
import { PaymentMethod } from 'src/generated/prisma/enums';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('unified')
  async createUnifiedBooking(@Body() createUnifiedBookingDto: CreateUnifiedBookingDto) {
    return this.checkoutService.createUnifiedBooking(createUnifiedBookingDto);
  }

  @Get('unified')
  async getAllUnifiedBookings() {
    return this.checkoutService.findAll();
  }

  @Patch('unified/:id/payment')
  async processPayment(
    @Param('id') id: string,
    @Body('amount', ParseFloatPipe) amount: number,
    @Body('method') method?: PaymentMethod,
  ) {
    return this.checkoutService.processPayment(id, amount, method);
  }

  @Post('unified/:id/cancel')
  async cancelUnifiedBooking(@Param('id') id: string) {
    return this.checkoutService.cancelUnifiedBooking(id);
  }
}
