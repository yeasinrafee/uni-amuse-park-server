import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, CreateUserOrderDto, UpdateOrderPaymentDto } from './dto/order.dto';

@Controller('restaurant/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.orderService.create(createOrderDto);
    return {
      message: 'Order created successfully',
      order,
    };
  }

  @Get()
  async findAll() {
    const orders = await this.orderService.findAll();
    return {
      message: 'Orders fetched successfully',
      orders,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findOne(id);
    return {
      message: 'Order fetched successfully',
      order,
    };
  }

  @Patch(':id/payment')
  async updatePayment(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderPaymentDto,
  ) {
    const order = await this.orderService.updatePayment(id, updateDto);
    return {
      message: 'Order payment updated successfully',
      order,
    };
  }

  @Post('user')
  async createByUser(@Body() createUserOrderDto: CreateUserOrderDto) {
    const order = await this.orderService.createByUser(createUserOrderDto);
    return {
      message: 'Order created successfully',
      order,
    };
  }

  @Get('user/:userId')
  async getOrdersByUserId(@Param('userId') userId: string) {
    const orders = await this.orderService.findByUserId(userId);
    return {
      message: 'User orders fetched successfully',
      orders,
    };
  }

  @Delete('user/:userId/:orderId')
  async removeByUser(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
  ) {
    await this.orderService.remove(orderId, userId);
    return {
      message: 'Order deleted successfully',
      orderId: orderId,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.orderService.remove(id);
    return {
      message: 'Order deleted successfully',
      orderId: id,
    };
  }
}
