import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateOrderDto, CreateUserOrderDto, UpdateOrderPaymentDto } from './dto/order.dto';
import { DiscountType, PaymentStatus } from 'src/generated/prisma/enums';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const { orderItems, discountAmount = 0, discountType = DiscountType.NONE, ...orderData } = createOrderDto;

    if (orderItems.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Fetch items to get prices and names
    const itemIds = orderItems.map((oi) => oi.itemId);
    const uniqueItemIds = [...new Set(itemIds)];
    const dbItems = await this.prisma.item.findMany({
      where: { id: { in: uniqueItemIds }, deletedAt: null },
    });

    if (dbItems.length !== uniqueItemIds.length) {
      throw new NotFoundException('One or more items not found');
    }

    const itemMap = new Map(dbItems.map((item) => [item.id, item]));

    let orderSubTotal = 0;
    let orderBaseAmount = 0;
    const itemsToCreate = orderItems.map((oi) => {
      const item = itemMap.get(oi.itemId);
      if (!item) {
        throw new NotFoundException(`Item with ID ${oi.itemId} not found`);
      }
      const itemPrice = item.price;
      const itemName = item.name;
      const quantity = oi.quantity;

      const itemDiscountAmount = oi.discountAmount || 0;
      const itemDiscountType = oi.discountType || DiscountType.NONE;

      const itemLineSubTotal = itemPrice * quantity;

      let itemLineTotal = itemLineSubTotal;
      if (itemDiscountType === DiscountType.FLAT_DISCOUNT) {
        if (itemDiscountAmount > itemLineSubTotal) {
          throw new BadRequestException(
            `Item discount (${itemDiscountAmount}) cannot exceed line subtotal (${itemLineSubTotal}) for item ${itemName}`,
          );
        }
        itemLineTotal = itemLineSubTotal - itemDiscountAmount;
      } else if (itemDiscountType === DiscountType.PERCENTAGE_DISCOUNT) {
        if (itemDiscountAmount > 100) {
          throw new BadRequestException(`Item discount percentage cannot exceed 100% for item ${itemName}`);
        }
        itemLineTotal = itemLineSubTotal - (itemLineSubTotal * (itemDiscountAmount / 100));
      }

      orderBaseAmount += itemLineTotal;

      return {
        itemId: oi.itemId,
        quantity,
        itemPrice,
        itemName,
        discountAmount: itemDiscountAmount,
        discountType: itemDiscountType,
        subTotal: itemLineSubTotal,
        total: itemLineTotal,
      };
    });

    // Calculate final total amount after order-level discount
    let totalAmount = orderBaseAmount;
    if (discountType === DiscountType.FLAT_DISCOUNT) {
      if (discountAmount > orderBaseAmount) {
        throw new BadRequestException(
          `Order discount (${discountAmount}) cannot exceed base amount (${orderBaseAmount})`,
        );
      }
      totalAmount = orderBaseAmount - discountAmount;
    } else if (discountType === DiscountType.PERCENTAGE_DISCOUNT) {
      if (discountAmount > 100) {
        throw new BadRequestException(`Order discount percentage cannot exceed 100%`);
      }
      totalAmount = orderBaseAmount - (orderBaseAmount * (discountAmount / 100));
    }

    const paidAmount = orderData.paidAmount || 0;
    if (paidAmount > totalAmount) {
      throw new BadRequestException(
        `Paid amount (${paidAmount}) cannot exceed total amount (${totalAmount})`,
      );
    }

    // Determine initial payment status
    let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
    if (paidAmount >= totalAmount && totalAmount > 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIALLY_PAID;
    }

    return this.prisma.restaurantOrder.create({
      data: {
        ...orderData,
        baseAmount: orderBaseAmount,
        totalAmount,
        paidAmount,
        paymentStatus,
        discountAmount,
        discountType,
        orderItems: {
          create: itemsToCreate,
        },
      },
      include: {
        orderItems: {
          include: { item: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.restaurantOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: { item: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { item: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async updatePayment(id: string, updateDto: UpdateOrderPaymentDto) {
    const order = await this.findOne(id);
    const newPaidAmount = updateDto.paidAmount;

    if (newPaidAmount > order.totalAmount) {
      throw new BadRequestException(
        `Paid amount (${newPaidAmount}) cannot exceed total amount (${order.totalAmount})`,
      );
    }

    let paymentStatus = updateDto.paymentStatus;
    if (!paymentStatus) {
      if (newPaidAmount >= order.totalAmount && order.totalAmount > 0) {
        paymentStatus = PaymentStatus.PAID;
      } else if (newPaidAmount > 0) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else {
        paymentStatus = PaymentStatus.UNPAID;
      }
    }

    return this.prisma.restaurantOrder.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus,
      },
    });
  }

  async createByUser(createUserOrderDto: CreateUserOrderDto) {
    const { userId, ...rest } = createUserOrderDto;

    // Map to CreateOrderDto with user specific constraints
    const createOrderDto: CreateOrderDto = {
      ...rest,
      staffId: userId, // Per user request: staff id te user er id ta niben
      discountAmount: 0,
      discountType: DiscountType.NONE,
      paidAmount: 0,
    };

    // Also ensure each item has no discount
    createOrderDto.orderItems = createOrderDto.orderItems.map((item) => ({
      ...item,
      discountAmount: 0,
      discountType: DiscountType.NONE,
    }));

    return this.create(createOrderDto);
  }

  async findByUserId(userId: string) {
    return this.prisma.restaurantOrder.findMany({
      where: { staffId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: { item: true },
        },
      },
    });
  }

  async remove(id: string, userId?: string) {
    const order = await this.findOne(id); // Ensure order exists

    // If userId is provided, ensure the order belongs to this user (staffId stores userId)
    if (userId && order.staffId !== userId) {
      throw new BadRequestException('You can only delete your own orders');
    }

    // Usually, paid orders should not be deletable by users
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid order');
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete associated order items first
      await tx.restaurantOrderDetails.deleteMany({
        where: { restaurantOrderId: id },
      });

      // Then delete the order
      return tx.restaurantOrder.delete({
        where: { id },
      });
    });
  }
}
