import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CreateOrderDto, OrderPaginationDto, PaidOrderDto } from './dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({ cmd: 'create_order' })
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);
    return { order };
  }

  @MessagePattern({ cmd: 'find_all_orders' })
  findAll(@Payload() pg: OrderPaginationDto) {
    return this.ordersService.findAll(pg);
  }

  @MessagePattern({ cmd: 'find_orders_by_status' })
  findByStatus(@Payload() pg: OrderPaginationDto) {
    return this.ordersService.findByStatus(pg);
  }

  @MessagePattern({ cmd: 'find_one_order' })
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_order_status' })
  updateOrderStatus(@Payload() dt: ChangeOrderStatusDto) {
    return this.ordersService.updateOrderStatus(dt);
  }

  @EventPattern('payment.succeded')
  async handlePaymentSucceded(@Payload() dt: PaidOrderDto) {
    return this.ordersService.markOrderAsPaid(dt);
  }
}
