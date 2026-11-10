import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { AdminGuard, AuthGuard, AuthRequest, requireAdmin } from './auth';
import { PrismaService } from './prisma.service';

const uploadDir = path.resolve(process.cwd(), 'uploads');
mkdirSync(uploadDir, { recursive: true });

class MovieDto {
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(5000) description!: string;
  @IsString() @MaxLength(80) genre!: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsInt() @Min(0) priceCents!: number;
}
class MovieUpdateDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) genre?: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsOptional() @IsInt() @Min(0) priceCents?: number;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: string;
}

@Controller('movies')
export class MoviesController {
  constructor(private prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.movie.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, title: true, description: true, genre: true, posterUrl: true, priceCents: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }
  @Get('admin/all') @UseGuards(AuthGuard)
  adminList(@Req() req: AuthRequest) {
    requireAdmin(req.authUser);
    return this.prisma.movie.findMany({ select: { id: true, title: true, description: true, genre: true, posterUrl: true, priceCents: true, status: true, createdAt: true, uploader: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  }
  @Get(':id') async detail(@Param('id') id: string) {
    const movie = await this.prisma.movie.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true, title: true, description: true, genre: true, posterUrl: true, priceCents: true, createdAt: true } });
    if (!movie) throw new NotFoundException();
    return movie;
  }
  @Post() @UseGuards(AuthGuard, AdminGuard)
  async create(@Req() req: AuthRequest, @Body() dto: MovieDto) {
    requireAdmin(req.authUser);
    return this.prisma.movie.create({ data: { ...dto, videoPath: '', uploaderId: req.authUser.id } });
  }
  @Patch(':id') @UseGuards(AuthGuard, AdminGuard)
  async update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: MovieUpdateDto) {
    requireAdmin(req.authUser);
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException();
    if (dto.status === 'PUBLISHED' && !movie.videoPath) throw new BadRequestException('Upload a video before publishing');
    return this.prisma.movie.update({ where: { id }, data: dto });
  }
  @Post(':id/upload') @UseGuards(AuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({ destination: uploadDir, filename: (_req, _file, cb) => cb(null, `${randomUUID()}.mp4`) }),
    limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'video/mp4'),
  }))
  async upload(@Req() req: AuthRequest, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    requireAdmin(req.authUser);
    if (!file) throw new BadRequestException('MP4 file required');
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException();
    return this.prisma.movie.update({ where: { id }, data: { videoPath: file.filename }, select: { id: true, title: true, status: true } });
  }
  @Get(':id/play-token') @UseGuards(AuthGuard)
  async playToken(@Req() req: AuthRequest, @Param('id') id: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie || movie.status !== 'PUBLISHED' || !movie.videoPath) throw new NotFoundException();
    const entitled = movie.priceCents === 0 || !!await this.prisma.order.findFirst({ where: { movieId: id, userId: req.authUser.id, status: 'PAID' } });
    if (!entitled && req.authUser.role !== 'ADMIN') throw new BadRequestException('Purchase required');
    if (!process.env.JWT_SECRET) throw new UnauthorizedException();
    return { token: jwt.sign({ movieId: id, scope: 'play' }, process.env.JWT_SECRET, { subject: req.authUser.id, expiresIn: '2h' }) };
  }
  @Get(':id/watch')
  async watch(@Req() req: AuthRequest, @Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    try {
      const payload = jwt.verify(token || '', process.env.JWT_SECRET || '') as jwt.JwtPayload;
      if (payload.scope !== 'play' || payload.movieId !== id) throw new Error('Invalid scope');
    } catch { throw new UnauthorizedException(); }
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie || movie.status !== 'PUBLISHED' || !movie.videoPath) throw new NotFoundException();
    const file = path.join(uploadDir, path.basename(movie.videoPath));
    if (!existsSync(file)) throw new NotFoundException('Video file missing');
    const size = statSync(file).size;
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) { res.status(416).end(); return; }
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start > end || start >= size) { res.status(416).end(); return; }
      res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', size);
      createReadStream(file).pipe(res);
    }
  }
}
