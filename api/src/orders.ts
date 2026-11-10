import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import Stripe from 'stripe';
import { AuthGuard, AuthRequest, requireAdmin } from './auth';
import { PrismaService } from './prisma.service';

class CreateOrderDto { @IsString() movieId!: string; }
class StatusDto { @IsIn(['PAID', 'CANCELLED']) status!: 'PAID' | 'CANCELLED'; }

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private prisma: PrismaService) {}
  @Post()
  async create(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id: dto.movieId } });
    if (!movie || movie.status !== 'PUBLISHED') throw new BadRequestException('Movie unavailable');
    const prior = await this.prisma.order.findFirst({ where: { userId: req.authUser.id, movieId: movie.id, status: { in: ['PENDING', 'PAID'] } }, orderBy: { createdAt: 'desc' } });
    if (prior) return prior;
    const status = movie.priceCents === 0 ? 'PAID' : 'PENDING';
    const order = await this.prisma.order.create({ data: { userId: req.authUser.id, movieId: movie.id, amountCents: movie.priceCents, status } });
    await this.prisma.notification.create({ data: { userId: req.authUser.id, title: status === 'PAID' ? 'Movie added to your library' : 'Order created', message: status === 'PAID' ? `You can now watch ${movie.title}.` : `Your order for ${movie.title} is pending payment confirmation.` } });
    return order;
  }
  @Get('me') me(@Req() req: AuthRequest) {
    return this.prisma.order.findMany({ where: { userId: req.authUser.id }, include: { movie: { select: { id: true, title: true, posterUrl: true } } }, orderBy: { createdAt: 'desc' } });
  }
  @Post(':id/checkout') async checkout(@Req() req: AuthRequest, @Param('id') id: string) {
    if (!process.env.STRIPE_SECRET_KEY) throw new ServiceUnavailableException('Online checkout is not configured');
    const order = await this.prisma.order.findFirst({ where: { id, userId: req.authUser.id }, include: { movie: true, user: true } });
    if (!order || order.status !== 'PENDING' || order.amountCents <= 0) throw new BadRequestException('Order is not payable');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    if (order.stripeSessionId) {
      const previous = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (previous.status === 'open' && previous.url) return { url: previous.url };
      if (previous.payment_status === 'paid') throw new BadRequestException('Payment is being confirmed');
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.user.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      line_items: [{ price_data: { currency: 'usd', unit_amount: order.amountCents, product_data: { name: order.movie.title } }, quantity: 1 }],
      success_url: `${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/account?checkout=success`,
      cancel_url: `${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/account?checkout=cancelled`,
    });
    await this.prisma.order.update({ where: { id }, data: { stripeSessionId: session.id } });
    return { url: session.url };
  }
  @Get() list(@Req() req: AuthRequest) {
    requireAdmin(req.authUser);
    return this.prisma.order.findMany({ include: { user: { select: { id: true, name: true, email: true } }, movie: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
  @Patch(':id/status') async status(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: StatusDto) {
    requireAdmin(req.authUser);
    const order = await this.prisma.order.findUnique({ where: { id }, include: { movie: true } });
    if (!order || order.status !== 'PENDING') throw new BadRequestException('Order is not pending');
    const updated = await this.prisma.order.update({ where: { id }, data: { status: dto.status } });
    await this.prisma.notification.create({ data: { userId: order.userId, title: dto.status === 'PAID' ? 'Purchase confirmed' : 'Order cancelled', message: dto.status === 'PAID' ? `You can now watch ${order.movie.title}.` : `Your order for ${order.movie.title} was cancelled.` } });
    return updated;
  }
}
