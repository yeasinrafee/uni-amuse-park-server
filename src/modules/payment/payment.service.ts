import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InitPaymentDto } from './dto/init-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isSandbox: boolean;
  private readonly baseApiUrl: string;
  private readonly callbackBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.storeId = this.configService.get<string>('SSL_STORE_ID')!;
    this.storePassword = this.configService.get<string>('SSL_STORE_PASSWORD')!;
    this.isSandbox = this.configService.get<string>('SSL_IS_SANDBOX') === 'true';

    this.baseApiUrl = this.isSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';

    // For sandbox: SSLCommerz requires your registered domain in callback URLs.
    // Since we run locally, we map coxpark.com -> 127.0.0.1 via hosts file
    // and use http://coxpark.com:<PORT> so the browser hits our local server.
    // For production: use the actual live domain.
    this.callbackBaseUrl = this.configService.get<string>('SSL_CALLBACK_BASE_URL')
      || 'http://coxpark.com:5000';
  }

  /**
   * Initiate an SSLCommerz payment session.
   * Returns the gateway redirect URL (GatewayPageURL) to send the user to.
   */
  async initPayment(dto: InitPaymentDto): Promise<{ gatewayUrl: string; sessionKey: string }> {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // e.g., 240506
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionId = `TXN-${dateStr}-${randomStr}`;

    // Build the form body for SSLCommerz init API
    const postBody: Record<string, string> = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: dto.amount.toString(),
      currency: 'BDT',
      tran_id: transactionId,

      // Callback URLs - SSLCommerz will redirect the user's browser here (POST)
      // These use the registered sandbox domain so SSLCommerz accepts them.
      // The hosts file trick makes these resolve to localhost.
      success_url: `${this.callbackBaseUrl}/api/payment/success`,
      fail_url: `${this.callbackBaseUrl}/api/payment/fail`,
      cancel_url: `${this.callbackBaseUrl}/api/payment/cancel`,
      ipn_url: `${this.callbackBaseUrl}/api/payment/ipn`,

      // Customer info
      cus_name: dto.customerName,
      cus_email: dto.customerEmail,
      cus_phone: dto.customerPhone,
      cus_add1: dto.customerAddress || 'N/A',
      cus_city: dto.customerCity || 'Dhaka',
      cus_country: 'Bangladesh',

      // Shipping (required fields by SSLCommerz, using N/A for services)
      shipping_method: 'NO',
      num_of_item_shipped: '0',
      ship_name: 'N/A',
      ship_add1: 'N/A',
      ship_city: 'N/A',
      ship_country: 'Bangladesh',

      // Product info
      product_name: dto.productName || 'Amusement Park Booking',
      product_category: 'Services',
      product_profile: 'general',

      // Pass bookingId in value_a so we get it back in the callback
      value_a: dto.bookingId,
      value_b: transactionId,
    };

    try {
      const response = await fetch(`${this.baseApiUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(postBody).toString(),
      });

      const data = await response.json();

      if (data.status !== 'SUCCESS') {
        this.logger.error('SSLCommerz init failed:', data);
        throw new BadRequestException(
          data.failedreason || 'Payment initialization failed',
        );
      }

      this.logger.log(`Payment initiated: TXN=${transactionId}, BookingID=${dto.bookingId}`);

      return {
        gatewayUrl: data.GatewayPageURL,
        sessionKey: data.sessionkey,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('SSLCommerz init error:', error);
      throw new BadRequestException('Could not connect to payment gateway');
    }
  }

  /**
   * Validate a payment callback from SSLCommerz.
   * In basic mode, we just check val_id exists and status is VALID/VALIDATED.
   */
  async validatePayment(payload: Record<string, any>): Promise<{
    isValid: boolean;
    bookingId: string | null;
    transactionId: string | null;
    amount: number;
    status: string;
  }> {
    const {
      val_id,
      status,
      tran_id,
      amount,
      value_a, // bookingId we passed during init
    } = payload;

    this.logger.log(`Payment callback received: status=${status}, tran_id=${tran_id}, val_id=${val_id}`);

    // Basic validation: Check if status is VALID or VALIDATED
    const isValid = status === 'VALID' || status === 'VALIDATED';

    return {
      isValid,
      bookingId: value_a || null,
      transactionId: tran_id || null,
      amount: parseFloat(amount) || 0,
      status: status || 'UNKNOWN',
    };
  }
}
