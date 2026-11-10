import { BadRequestException, Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AuthGuard, AuthRequest, requireAdmin } from './auth';
import { PrismaService } from './prisma.service';

class UserStatusDto { @IsIn(['ACTIVE', 'SUSPENDED']) status!: 'ACTIVE' | 'SUSPENDED'; }

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}
  @Get('stats') async stats(@Req() req: AuthRequest) {
    requireAdmin(req.authUser);
    const [users, movies, pendingOrders, paidOrders, revenue] = await Promise.all([
      this.prisma.user.count(), this.prisma.movie.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PAID' } }),
      this.prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true } }),
    ]);
    return { users, movies, pendingOrders, paidOrders, revenueCents: revenue._sum.amountCents || 0 };
  }
  @Get('users') users(@Req() req: AuthRequest) {
    requireAdmin(req.authUser);
    return this.prisma.user.findMany({ select: { id: true, name: true, email: true, avatarUrl: true, role: true, status: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
  @Patch('users/:id/status') updateUserStatus(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UserStatusDto) {
    requireAdmin(req.authUser);
    if (id === req.authUser.id) throw new BadRequestException('Cannot change your own status');
    return this.prisma.user.update({ where: { id }, data: { status: dto.status }, select: { id: true, status: true } });
  }
}
