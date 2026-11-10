import { Controller, Get, Param, Patch, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard, AuthRequest } from './auth';
import { PrismaService } from './prisma.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private prisma: PrismaService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.prisma.notification.findMany({ where: { userId: req.authUser.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  @Patch(':id/read') async read(@Req() req: AuthRequest, @Param('id') id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId: req.authUser.id }, data: { readAt: new Date() } });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
}
