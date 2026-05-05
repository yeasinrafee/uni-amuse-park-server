import { Module } from '@nestjs/common';
import { CategoryModule } from './category/category.module';
import { ItemModule } from './item/item.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [CategoryModule, ItemModule, OrderModule],
  exports: [CategoryModule, ItemModule, OrderModule],
})
export class RestaurantModule {}
