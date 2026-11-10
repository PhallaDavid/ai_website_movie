import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthGuard, AuthRequest } from './auth';
import { PrismaService } from './prisma.service';

class ProfileDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
}

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private prisma: PrismaService) {}
  @Get('me')
  me(@Req() req: AuthRequest) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: req.authUser.id }, select: { id: true, email: true, name: true, avatarUrl: true, bio: true, role: true, createdAt: true } });
  }
  @Patch('me')
  update(@Req() req: AuthRequest, @Body() dto: ProfileDto) {
    return this.prisma.user.update({ where: { id: req.authUser.id }, data: dto, select: { id: true, email: true, name: true, avatarUrl: true, bio: true, role: true } });
  }
}
