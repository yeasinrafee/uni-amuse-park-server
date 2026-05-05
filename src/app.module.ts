import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { UserModule } from './modules/user/user.module';
import { BannerModule } from './modules/banner/banner.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { HomeGalleryModule } from './modules/home-gallery/home-gallery.module';
import { LogoContactModule } from './modules/logo-contact/logo-contact.module';
import { TeamModule } from './modules/team/team.module';
import { UsefulLinkModule } from './modules/useful-links/useful-link.module';
import { OpeningModule } from './modules/opening/opening.module';
import { MomentsModule } from './modules/moments/moments.module';
import { SupportModule } from './modules/support/support.module';
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
    BannerModule,
    FacilitiesModule,
    GalleryModule,
    HomeGalleryModule,
    LogoContactModule,
    TeamModule,
    UsefulLinkModule,
    OpeningModule,
    MomentsModule,
    SupportModule,
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

