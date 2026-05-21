import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { UserModule } from './modules/user/user.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { RoomModule } from './modules/room/room.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportModule } from './modules/report/report.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    TicketModule,
    CloudinaryModule,
    UserModule,
    RestaurantModule,
    RoomModule,
    CheckoutModule,
    AnalyticsModule,
    ReportModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

