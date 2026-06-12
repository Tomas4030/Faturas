import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email já registado');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    });

    // Assign free plan
    const freePlan = await this.prisma.plan.findUnique({
      where: { name: 'Free' },
    });
    if (freePlan) {
      await this.prisma.subscription.create({
        data: { userId: user.id, planId: freePlan.id },
      });
    }

    return { ...this.issueTokens(user.id), user_id: user.id };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return { ...this.issueTokens(user.id), user_id: user.id };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      if (payload.type !== 'refresh') throw new Error();
      return { access_token: this.signAccessToken(payload.sub) };
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async forgotPassword(_email: string) {
    return { message: 'Se o email existir, receberás instruções' };
  }

  async resetPassword(token: string, newPassword: string) {
    // For now, token is a userId
    const user = await this.prisma.user.findUnique({ where: { id: token } });
    if (!user) throw new UnauthorizedException('Token inválido');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: token },
      data: { passwordHash },
    });

    return { message: 'Password atualizada com sucesso' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await this.prisma.usageCounter.findUnique({
      where: { userId_periodStart: { userId, periodStart } },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.subscription?.plan ?? null,
      usage: {
        receiptsScanned: usage?.receiptsScanned ?? 0,
        splitsCreated: usage?.splitsCreated ?? 0,
      },
    };
  }

  private issueTokens(userId: string) {
    return {
      access_token: this.signAccessToken(userId),
      refresh_token: this.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: '30d' }),
    };
  }

  private signAccessToken(userId: string): string {
    return this.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: '15m' });
  }
}
