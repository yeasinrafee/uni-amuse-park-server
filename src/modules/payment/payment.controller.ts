import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { InitPaymentDto } from './dto/init-payment.dto';
import { CheckoutService } from '../checkout/checkout.service';
import { PaymentMethod } from 'src/generated/prisma/enums';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly checkoutService: CheckoutService,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * POST /api/payment/init
   * Frontend calls this to start a payment. Returns the SSLCommerz gateway URL.
   */
  @Post('init')
  async initPayment(@Body() initPaymentDto: InitPaymentDto) {
    const result = await this.paymentService.initPayment(initPaymentDto);
    return {
      success: true,
      gatewayUrl: result.gatewayUrl,
      sessionKey: result.sessionKey,
    };
  }

  /**
   * Helper to return an HTML page that redirects the user.
   * This avoids some browser security warnings when redirecting from HTTP POST to another domain.
   */
  private sendRedirectPage(res: Response, url: string) {
    res.type('html');
    return res.send(`
      <html>
        <head>
          <title>Redirecting...</title>
          <script>
            window.location.href = "${url}";
          </script>
        </head>
        <body>
          <p>Redirecting you back to the application...</p>
          <a href="${url}">Click here if you are not redirected automatically</a>
        </body>
      </html>
    `);
  }

  /**
   * POST /api/payment/success
   * SSLCommerz redirects here (POST) after a successful payment.
   */
  @Post('success')
  async paymentSuccess(@Body() body: Record<string, any>, @Res() res: Response) {
    this.logger.log('Payment SUCCESS callback received');
    this.logger.log(`Payload: ${JSON.stringify(body)}`);

    const validation = await this.paymentService.validatePayment(body);

    if (validation.isValid && validation.bookingId) {
      this.logger.log(`Payment VALID for booking: ${validation.bookingId}, amount: ${validation.amount}`);
      
      try {
        // Determine payment method from payload (card_type or similar)
        const method = body.card_type?.toLowerCase().includes('bkash') 
          ? PaymentMethod.BKASH 
          : PaymentMethod.BANK;

        await this.checkoutService.processPayment(
          validation.bookingId, 
          validation.amount, 
          method,
          validation.transactionId || undefined
        );
        this.logger.log(`Database updated for booking: ${validation.bookingId}`);
      } catch (error) {
        this.logger.error(`Error updating database for booking ${validation.bookingId}:`, error);
      }
    }

    // Redirect user's browser back to frontend success page
    const redirectUrl = `${this.frontendUrl}/payment/success?bookingId=${validation.bookingId}&transactionId=${validation.transactionId}&amount=${validation.amount}&status=${validation.status}`;
    return this.sendRedirectPage(res, redirectUrl);
  }

  /**
   * POST /api/payment/fail
   * SSLCommerz redirects here when payment fails.
   */
  @Post('fail')
  async paymentFail(@Body() body: Record<string, any>, @Res() res: Response) {
    this.logger.log('Payment FAIL callback received');
    this.logger.log(`Payload: ${JSON.stringify(body)}`);

    const bookingId = body.value_a || '';
    const transactionId = body.tran_id || '';

    // Redirect user's browser back to frontend fail page
    const redirectUrl = `${this.frontendUrl}/payment/fail?bookingId=${bookingId}&transactionId=${transactionId}`;
    return this.sendRedirectPage(res, redirectUrl);
  }

  /**
   * POST /api/payment/cancel
   * SSLCommerz redirects here when user cancels payment.
   */
  @Post('cancel')
  async paymentCancel(@Body() body: Record<string, any>, @Res() res: Response) {
    this.logger.log('Payment CANCEL callback received');
    this.logger.log(`Payload: ${JSON.stringify(body)}`);

    const bookingId = body.value_a || '';
    const transactionId = body.tran_id || '';

    // Redirect user's browser back to frontend cancel page
    const redirectUrl = `${this.frontendUrl}/payment/cancel?bookingId=${bookingId}&transactionId=${transactionId}`;
    return this.sendRedirectPage(res, redirectUrl);
  }

  /**
   * POST /api/payment/ipn
   * IPN (Instant Payment Notification) - server-to-server callback.
   * This is the most reliable way to confirm payment status.
   */
  @Post('ipn')
  async paymentIpn(@Body() body: Record<string, any>) {
    this.logger.log('Payment IPN callback received');
    this.logger.log(`IPN Payload: ${JSON.stringify(body)}`);

    const validation = await this.paymentService.validatePayment(body);

    if (validation.isValid && validation.bookingId) {
      this.logger.log(`IPN VALID for booking: ${validation.bookingId}, amount: ${validation.amount}`);
      
      try {
        const method = body.card_type?.toLowerCase().includes('bkash') 
          ? PaymentMethod.BKASH 
          : PaymentMethod.BANK;

        await this.checkoutService.processPayment(
          validation.bookingId, 
          validation.amount, 
          method,
          validation.transactionId || undefined
        );
        this.logger.log(`IPN: Database updated for booking: ${validation.bookingId}`);
      } catch (error) {
        this.logger.error(`IPN: Error updating database for booking ${validation.bookingId}:`, error);
      }
    }

    return { status: 'received' };
  }
}
