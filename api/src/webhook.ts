import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { PrismaService } from './prisma.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private prisma: PrismaService) {}
  @Post('stripe')
  async stripe(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !req.rawBody || !signature) throw new BadRequestException('Stripe webhook unavailable');
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch { throw new BadRequestException('Invalid Stripe signature'); }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid' || !session.metadata?.orderId) return { received: true };
      const order = await this.prisma.order.findUnique({ where: { id: session.metadata.orderId }, include: { movie: true } });
      if (!order || order.stripeSessionId !== session.id || session.amount_total !== order.amountCents || session.currency !== 'usd') throw new BadRequestException('Checkout does not match order');
      const result = await this.prisma.order.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'PAID' } });
      if (result.count) await this.prisma.notification.create({ data: { userId: order.userId, title: 'Purchase confirmed', message: `You can now watch ${order.movie.title}.` } });
    }
    return { received: true };
  }
}
