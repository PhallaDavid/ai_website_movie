import { Body, Controller, CanActivate, ExecutionContext, Injectable, Logger, Post, ServiceUnavailableException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import { PrismaService } from './prisma.service';
import type { Request } from 'express';

export type AuthUser = { id: string; role: string };
export type AuthRequest = Request & { authUser: AuthUser };

export class FirebaseLoginDto { @IsString() idToken!: string; }

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token || !process.env.JWT_SECRET) throw new UnauthorizedException();
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
      if (typeof payload.sub !== 'string') throw new Error('Missing user');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true } });
      if (!user || user.status !== 'ACTIVE') throw new Error('User unavailable');
      request.authUser = user;
      return true;
    } catch { throw new UnauthorizedException(); }
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    requireAdmin(request.authUser);
    return true;
  }
}

export function requireAdmin(user: AuthUser) {
  if (user.role !== 'ADMIN') throw new UnauthorizedException('Admin access required');
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private prisma: PrismaService) {}

  @Post('firebase')
  async firebaseLogin(@Body() body: FirebaseLoginDto) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new BadRequestException('Firebase sign-in is not configured');
    }
    if (!getApps().length) initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
    });
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(body.idToken, Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    } catch (error) {
      const failure = error as { code?: string; message?: string };
      this.logger.warn(`Firebase verification failed: ${failure.code || 'unknown'}: ${failure.message || 'no message'}`);
      if (/Error while making request|certificate.fetch|EACCES|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(failure.message || '')) {
        throw new ServiceUnavailableException('Firebase verification is temporarily unavailable');
      }
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
    if (!decoded.email || !decoded.email_verified || decoded.firebase.sign_in_provider !== 'google.com') {
      throw new UnauthorizedException('Verified Google sign-in required');
    }
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    const admin = admins.includes(decoded.email.toLowerCase());
    const existing = await this.prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    const emailOwner = await this.prisma.user.findUnique({ where: { email: decoded.email } });
    if (existing && emailOwner && existing.id !== emailOwner.id) throw new UnauthorizedException('Email belongs to another account');
    if (emailOwner?.firebaseUid && emailOwner.firebaseUid !== decoded.uid) throw new UnauthorizedException('Email belongs to another account');
    const linked = existing || emailOwner;
    const user = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { email: decoded.email, avatarUrl: decoded.picture || existing.avatarUrl, role: admin ? 'ADMIN' : 'USER' } })
      : linked
        ? await this.prisma.user.update({ where: { id: linked.id }, data: { firebaseUid: decoded.uid, avatarUrl: decoded.picture || linked.avatarUrl, role: admin ? 'ADMIN' : 'USER' } })
        : await this.prisma.user.create({ data: { legacyGoogleId: `firebase:${decoded.uid}`, firebaseUid: decoded.uid, email: decoded.email, name: decoded.name || decoded.email, avatarUrl: decoded.picture, role: admin ? 'ADMIN' : 'USER' } });
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account suspended');
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: '7d' });
    return { token, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, role: user.role } };
  }
}
