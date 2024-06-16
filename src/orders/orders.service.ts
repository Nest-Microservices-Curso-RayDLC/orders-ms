import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto, PaidOrderDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }
  
  async create(dt: CreateOrderDto) {
    const productIds = dt.items.map(item => item.productId);
    const products = await this.methodObtainProductsByIds(productIds);

    const totalAmount = dt.items.reduce((acc, orderItem) => {
      const price = products.find(product => product.id === orderItem.productId).price;
      return (price * orderItem.quantity) + acc;
    }, 0);

    const totalItems = dt.items.reduce((acc, orderItem) => acc + orderItem.quantity, 0);

    const order = await this.order.create({
      data: {
        totalAmount,
        totalItems,
        OrderItem: {
          createMany: {
            data: dt.items.map(({ productId, quantity }) => ({
              productId,
              quantity,
              price: products.find(product => product.id === productId).price
            }))
          }
        }
      }, include: { OrderItem: { select: { price: true, quantity: true, productId: true } } }
    });

    return { 
      ...order,
      OrderItem: 
        order.OrderItem
          .map(item => ({ ...item, name: products.find(product => product.id === item.productId).name })) 
    };
  }

  async findAll(pg: OrderPaginationDto) {
    const { page: currentPage, limit: perPage, status } = pg;
    const totalPages = await this.order.count({
      where: { status }
    })
    
    
    const orders = await this.order.findMany({
      skip: (currentPage - 1) * perPage,
      take: perPage,
      where: { status },
      include: { OrderItem: { select: { price: true, quantity: true, productId: true } } }
    });

    const products = await this.methodObtainProductsByIds(orders.flatMap(order => order.OrderItem.map(item => item.productId)));
    orders.forEach(order => {
      order.OrderItem = order.OrderItem.map(item => ({
        ...item,
        name: products.find(product => product.id === item.productId).name
      }))
    });
    return {
      data: orders,
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage)
      }
    }
  }

  async findByStatus(pg: OrderPaginationDto) {
    const { page: currentPage, limit: perPage, status } = pg;
    const totalPages = await this.order.count({
      where: { status }
    })
    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: { status }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage)
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id },
      include: { OrderItem: { select: { price: true, quantity: true, productId: true } } }
    });
    if (!order) throw new RpcException({
      status: HttpStatus.NOT_FOUND,
      message: `Order with id ${id} not found`
    });
    const products = await this.methodObtainProductsByIds(order.OrderItem.map(item => item.productId));
    return {
      ...order,
      OrderItem: order.OrderItem.map(item => ({
        ...item,
        name: products.find(product => product.id === item.productId).name
      }))
    };
  }

  async updateOrderStatus(dt: ChangeOrderStatusDto) {
    const { id, status } = dt;
    const order = await this.findOne(id);
    if(order.status === status) throw new RpcException({
      status: HttpStatus.BAD_REQUEST,
      message: `Order already has status ${status}`
    });

    return this.order.update({
      where: { id },
      data: { status }
    })
  };

  methodObtainProductsByIds = (productIds: number[]): Promise<any> =>
    firstValueFrom(this.natsClient.send({ cmd: 'validate_products' }, {
      ids: productIds
    }).pipe(
      catchError((error) => throwError(() => new RpcException(error)))
    ));

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.natsClient.send('payment.session.create', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map(({ name, price, quantity }) => ({ name, price, quantity }))
      })
    );
    return paymentSession;
  }

  async markOrderAsPaid(dt: PaidOrderDto) {
    const updatedOrder = await this.order.update({
      where: { id: dt.orderId },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: dt.stripePaymentId,
        // Relacion 
        OrderReceipt: {
          create: {
            receiptUrl: dt.receiptUrl
          }
        }
      }
    })
    return updatedOrder;
  }
}
