import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController, AuthGuard, AdminGuard } from './auth';
import { UsersController } from './users';
import { MoviesController } from './movies';
import { OrdersController } from './orders';
import { NotificationsController } from './notifications';
import { DashboardController } from './dashboard';
import { WebhookController } from './webhook';
import { HealthController } from './health';

@Module({
  controllers: [AuthController, UsersController, MoviesController, OrdersController, NotificationsController, DashboardController, WebhookController, HealthController],
  providers: [PrismaService, AuthGuard, AdminGuard],
})
export class AppModule {}
