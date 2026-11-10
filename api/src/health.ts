import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}
  @Get()
  async check() {
    await this.prisma.user.count();
    return { status: 'ok' };
  }
}
