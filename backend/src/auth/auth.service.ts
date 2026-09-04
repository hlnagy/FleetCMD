import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword, needsRehash, generateJwt } from './crypto.util';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from './login-limiter';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedInitialUsers();
    await this.migrateLegacyPasswords();
  }

  async seedInitialUsers() {
    const userCount = await this.prisma.user.count();
    if (userCount === 0) {
      console.log('Seeding initial FleetCMD users with PBKDF2 hashes...');
      const defaultUsers = [
        {
          nume: 'Administrator Principal',
          email: 'admin@fleetcmd.ro',
          username: 'admin',
          parola: hashPassword('admin123'),
          rol: 'ADMIN',
          functie: 'Administrator Sistem',
          telefon: '0744111222',
          activ: true,
        },
        {
          nume: 'Brașoveanu Virgil',
          email: 'dispecer@fleetcmd.ro',
          username: 'dispecer',
          parola: hashPassword('operator123'),
          rol: 'OPERATOR',
          functie: 'Șef Flotă & Atelier',
          telefon: '0744333444',
          activ: true,
        },
        {
          nume: 'Inspector Audit / Vizitator',
          email: 'vizitator@fleetcmd.ro',
          username: 'vizitator',
          parola: hashPassword('viewer123'),
          rol: 'VIEWER',
          functie: 'Vizitator / Numai Citire',
          telefon: '0722000111',
          activ: true,
        },
      ];

      for (const u of defaultUsers) {
        await this.prisma.user.create({ data: u });
      }
      console.log('Initial users seeded successfully.');
    }
  }

  async migrateLegacyPasswords() {
    try {
      const users = await this.prisma.user.findMany();
      for (const u of users) {
        if (needsRehash(u.parola)) {
          await this.prisma.user.update({
            where: { id: u.id },
            data: { parola: hashPassword(u.parola) },
          });
          console.log(`Securizat parola contului @${u.username} prin hash PBKDF2-SHA512.`);
        }
      }
    } catch (e) {
      console.warn('Avertisment la migrarea automată a parolelor:', e);
    }
  }

  private async getValidActor(actorUserId?: string) {
    if (actorUserId) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: actorUserId } });
        if (user) {
          return {
            userId: user.id,
            userNume: user.nume,
            userRol: user.rol,
          };
        }
      } catch (e) {}
    }
    try {
      const admin = await this.prisma.user.findFirst({ where: { rol: 'ADMIN' } });
      if (admin) {
        return {
          userId: admin.id,
          userNume: admin.nume,
          userRol: admin.rol,
        };
      }
    } catch (e) {}
    return {
      userId: null,
      userNume: 'Administrator',
      userRol: 'ADMIN',
    };
  }

  async login(data: { identifier: string; parola: string }, clientIp?: string) {
    const { identifier, parola } = data;
    if (!identifier || !parola) {
      throw new BadRequestException('Numele de utilizator și parola sunt obligatorii.');
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const rateLimitKey = `${clientIp || 'client'}:${cleanIdentifier}`;

    // 1. Verificare protecție anti-forță brută (Rate Limiting)
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      throw new HttpException(
        `Prea multe încercări eșuate de conectare. Accesul este temporar restricționat din motive de securitate. Vă rugăm să reîncercați peste ${rateLimit.retryAfterSeconds} secunde.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { username: identifier.trim() },
          { email: cleanIdentifier },
        ],
      },
    });

    // 2. Verificare credențiale cu hash criptografic
    const isPasswordCorrect = user ? verifyPassword(parola, user.parola) : false;

    if (!user || !isPasswordCorrect) {
      const attempt = recordFailedAttempt(rateLimitKey);
      if (attempt.blocked) {
        throw new HttpException(
          'Ați depășit limita de 5 încercări eșuate. Contul/IP-ul a fost blocat temporar pentru 5 minute.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException(
        `Nume de utilizator sau parolă incorectă. Încercări rămase: ${attempt.attemptsLeft}.`,
      );
    }

    if (!user.activ) {
      throw new UnauthorizedException('Acest cont de utilizator a fost dezactivat de un administrator.');
    }

    // Resetăm încercările eșuate la autentificare reușită
    clearFailedAttempts(rateLimitKey);

    // 3. Migrare transparentă dacă parola era încă în text clar
    if (needsRehash(user.parola)) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { parola: hashPassword(parola) },
        });
      } catch (err) {
        console.error('Failed to rehash password:', err);
      }
    }

    // 4. Jurnalizare eveniment autentificare în jurnalul de audit
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          userNume: user.nume,
          userRol: user.rol,
          actiune: 'LOGIN',
          modul: 'AUTENTIFICARE',
          entitateTip: 'User',
          entitateId: user.id,
          detalii: `Autentificare reușită pentru ${user.nume} (@${user.username}, ${user.rol})`,
          ipAdresa: clientIp || null,
        },
      });
    } catch (e) {
      console.error('Failed to log login audit:', e);
    }

    // 5. Generare token JWT autentic semnat criptografic HMAC-SHA256
    const token = generateJwt({
      sub: user.id,
      username: user.username,
      rol: user.rol,
      nume: user.nume,
    });

    const { parola: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword,
    };
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nume: true,
        email: true,
        username: true,
        rol: true,
        functie: true,
        telefon: true,
        activ: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { auditLogs: true },
        },
      },
    });
    return users;
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nume: true,
        email: true,
        username: true,
        rol: true,
        functie: true,
        telefon: true,
        activ: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit.');
    return user;
  }

  async createUser(data: {
    nume: string;
    username: string;
    email?: string;
    parola: string;
    rol: string;
    functie?: string;
    telefon?: string;
    actorUserId?: string;
  }) {
    if (!data.nume || !data.username || !data.parola) {
      throw new BadRequestException('Numele, utilizatorul și parola sunt obligatorii.');
    }

    const usernameClean = data.username.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        username: usernameClean,
      },
    });

    if (existing) {
      throw new BadRequestException('Un utilizator cu acest nume de utilizator există deja.');
    }

    const rol = ['ADMIN', 'OPERATOR', 'VIEWER'].includes(data.rol) ? data.rol : 'OPERATOR';

    const newUser = await this.prisma.user.create({
      data: {
        nume: data.nume.trim(),
        username: usernameClean,
        email: data.email?.trim() || null,
        parola: hashPassword(data.parola),
        rol,
        functie: data.functie || (rol === 'ADMIN' ? 'Administrator' : rol === 'OPERATOR' ? 'Operator Flotă' : 'Vizitator'),
        telefon: data.telefon || null,
        activ: true,
      },
    });

    // Log in audit safely
    const actor = await this.getValidActor(data.actorUserId);
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actor.userId,
          userNume: actor.userNume,
          userRol: actor.userRol,
          actiune: 'CREARE_UTILIZATOR',
          modul: 'UTILIZATORI',
          entitateTip: 'User',
          entitateId: newUser.id,
          detalii: `Creat utilizator nou: ${newUser.nume} (@${newUser.username}) cu rolul ${newUser.rol} de către ${actor.userNume}`,
        },
      });
    } catch (e) {
      console.error('Failed to log user creation audit:', e);
    }

    const { parola: _, ...result } = newUser;
    return result;
  }

  async updateUser(
    id: string,
    data: {
      nume?: string;
      username?: string;
      email?: string;
      parola?: string;
      rol?: string;
      functie?: string;
      telefon?: string;
      activ?: boolean;
      actorUserId?: string;
    }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit.');

    // Protect administrator account from being deactivated
    if ((user.rol === 'ADMIN' || user.username === 'admin') && data.activ === false) {
      throw new BadRequestException('Contul de administrator este protejat și nu poate fi dezactivat.');
    }

    // Protect administrator account from being demoted
    if (user.username === 'admin' && data.rol && data.rol !== 'ADMIN') {
      throw new BadRequestException('Rolul contului principal de administrator nu poate fi modificat.');
    }

    const updateData: any = {};
    if (data.nume) updateData.nume = data.nume.trim();
    if (data.username) {
      const uClean = data.username.trim().toLowerCase();
      if (uClean !== user.username) {
        const existing = await this.prisma.user.findFirst({ where: { username: uClean } });
        if (existing) {
          throw new BadRequestException('Un utilizator cu acest nume de utilizator există deja.');
        }
      }
      updateData.username = uClean;
    }
    if (data.email !== undefined) updateData.email = data.email ? data.email.trim() : null;
    if (data.parola) updateData.parola = hashPassword(data.parola);
    if (data.rol && ['ADMIN', 'OPERATOR', 'VIEWER'].includes(data.rol)) {
      if (user.username === 'admin') {
        updateData.rol = 'ADMIN';
      } else {
        updateData.rol = data.rol;
      }
    }
    if (data.functie !== undefined) updateData.functie = data.functie;
    if (data.telefon !== undefined) updateData.telefon = data.telefon;
    if (data.activ !== undefined) {
      if (user.rol === 'ADMIN' || user.username === 'admin') {
        updateData.activ = true;
      } else {
        updateData.activ = data.activ;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log in audit safely
    const actor = await this.getValidActor(data.actorUserId);
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actor.userId,
          userNume: actor.userNume,
          userRol: actor.userRol,
          actiune: 'MODIFICARE_UTILIZATOR',
          modul: 'UTILIZATORI',
          entitateTip: 'User',
          entitateId: updated.id,
          detalii: `Actualizat utilizator: ${updated.nume} (@${updated.username}) de către ${actor.userNume}. Modificări: ${Object.keys(updateData).join(', ')}`,
        },
      });
    } catch (e) {
      console.error('Failed to log user update audit:', e);
    }

    const { parola: _, ...result } = updated;
    return result;
  }

  async deleteUser(id: string, actorUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit.');

    // Contul de administrator nu poate fi sters
    if (user.rol === 'ADMIN' || user.username === 'admin') {
      throw new BadRequestException('Contul de administrator este protejat și nu poate fi șters din sistem.');
    }

    await this.prisma.user.delete({ where: { id } });

    // Log in audit safely
    const actor = await this.getValidActor(actorUserId);
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actor.userId,
          userNume: actor.userNume,
          userRol: actor.userRol,
          actiune: 'STERGERE_UTILIZATOR',
          modul: 'UTILIZATORI',
          entitateTip: 'User',
          entitateId: id,
          detalii: `Șters utilizator: ${user.nume} (@${user.username}) de către ${actor.userNume}`,
        },
      });
    } catch (e) {
      console.error('Failed to log user delete audit:', e);
    }

    return { mesaj: `Utilizatorul "${user.nume}" a fost șters din sistem.` };
  }

  async resetPassword(id: string, nouaParola: string, actorUserId?: string) {
    if (!nouaParola || nouaParola.trim().length < 4) {
      throw new BadRequestException('Noua parolă trebuie să aibă cel puțin 4 caractere.');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit.');

    await this.prisma.user.update({
      where: { id },
      data: { parola: hashPassword(nouaParola.trim()) },
    });

    const actor = await this.getValidActor(actorUserId);
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actor.userId,
          userNume: actor.userNume,
          userRol: actor.userRol,
          actiune: 'RESETARE_PAROLA',
          modul: 'UTILIZATORI',
          entitateTip: 'User',
          entitateId: id,
          detalii: `Parola pentru contul "${user.username}" (${user.nume}) a fost resetată de către ${actor.userNume}.`,
        },
      });
    } catch (e) {
      console.error('Failed to log reset password audit:', e);
    }

    return { mesaj: `Parola pentru utilizatorul "${user.nume}" a fost resetată cu succes!` };
  }
}
