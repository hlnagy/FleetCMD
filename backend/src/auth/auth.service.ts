import { Injectable, OnModuleInit, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedInitialUsers();
  }

  async seedInitialUsers() {
    const userCount = await this.prisma.user.count();
    if (userCount === 0) {
      console.log('Seeding initial FleetCMD users...');
      const defaultUsers = [
        {
          nume: 'Administrator Principal',
          email: 'admin@fleetcmd.ro',
          username: 'admin',
          parola: 'admin123',
          rol: 'ADMIN',
          functie: 'Administrator Sistem',
          telefon: '0744111222',
          activ: true,
        },
        {
          nume: 'Brașoveanu Virgil',
          email: 'dispecer@fleetcmd.ro',
          username: 'dispecer',
          parola: 'operator123',
          rol: 'OPERATOR',
          functie: 'Șef Flotă & Atelier',
          telefon: '0744333444',
          activ: true,
        },
        {
          nume: 'Inspector Audit / Vizitator',
          email: 'vizitator@fleetcmd.ro',
          username: 'vizitator',
          parola: 'viewer123',
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

  async login(data: { identifier: string; parola: string }) {
    const { identifier, parola } = data;
    if (!identifier || !parola) {
      throw new BadRequestException('Email/Username și parola sunt obligatorii.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.trim().toLowerCase() },
          { username: identifier.trim() },
        ],
      },
    });

    if (!user || user.parola !== parola) {
      throw new UnauthorizedException('Credențiale invalide. Verificați email-ul/utilizatorul și parola.');
    }

    if (!user.activ) {
      throw new UnauthorizedException('Acest cont de utilizator a fost dezactivat de un administrator.');
    }

    // Log login in audit
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userNume: user.nume,
        userRol: user.rol,
        actiune: 'LOGIN',
        modul: 'AUTENTIFICARE',
        entitateTip: 'User',
        entitateId: user.id,
        detalii: `Autentificare reușită pentru ${user.nume} (${user.rol})`,
      },
    });

    const { parola: _, ...userWithoutPassword } = user;
    return {
      token: `token-${user.id}-${Date.now()}`,
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
    email: string;
    username?: string;
    parola: string;
    rol: string;
    functie?: string;
    telefon?: string;
    actorUserId?: string;
  }) {
    if (!data.nume || !data.email || !data.parola) {
      throw new BadRequestException('Numele, emailul și parola sunt obligatorii.');
    }

    const emailClean = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailClean },
          ...(data.username ? [{ username: data.username.trim() }] : []),
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Un utilizator cu acest email sau nume de utilizator există deja.');
    }

    const rol = ['ADMIN', 'OPERATOR', 'VIEWER'].includes(data.rol) ? data.rol : 'OPERATOR';

    const newUser = await this.prisma.user.create({
      data: {
        nume: data.nume.trim(),
        email: emailClean,
        username: data.username ? data.username.trim() : emailClean.split('@')[0],
        parola: data.parola,
        rol,
        functie: data.functie || (rol === 'ADMIN' ? 'Administrator' : rol === 'OPERATOR' ? 'Operator Flotă' : 'Vizitator'),
        telefon: data.telefon || null,
        activ: true,
      },
    });

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        userId: data.actorUserId || null,
        userNume: 'Administrator',
        userRol: 'ADMIN',
        actiune: 'CREARE_UTILIZATOR',
        modul: 'UTILIZATORI',
        entitateTip: 'User',
        entitateId: newUser.id,
        detalii: `Creat utilizator nou: ${newUser.nume} (${newUser.email}) cu rolul ${newUser.rol}`,
      },
    });

    const { parola: _, ...result } = newUser;
    return result;
  }

  async updateUser(
    id: string,
    data: {
      nume?: string;
      email?: string;
      username?: string;
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

    const updateData: any = {};
    if (data.nume) updateData.nume = data.nume.trim();
    if (data.email) updateData.email = data.email.trim().toLowerCase();
    if (data.username) updateData.username = data.username.trim();
    if (data.parola) updateData.parola = data.parola;
    if (data.rol && ['ADMIN', 'OPERATOR', 'VIEWER'].includes(data.rol)) updateData.rol = data.rol;
    if (data.functie !== undefined) updateData.functie = data.functie;
    if (data.telefon !== undefined) updateData.telefon = data.telefon;
    if (data.activ !== undefined) updateData.activ = data.activ;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        userId: data.actorUserId || null,
        userNume: 'Administrator',
        userRol: 'ADMIN',
        actiune: 'MODIFICARE_UTILIZATOR',
        modul: 'UTILIZATORI',
        entitateTip: 'User',
        entitateId: updated.id,
        detalii: `Actualizat utilizator: ${updated.nume} (${updated.email}). Modificări: ${Object.keys(updateData).join(', ')}`,
      },
    });

    const { parola: _, ...result } = updated;
    return result;
  }

  async deleteUser(id: string, actorUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit.');

    // Count admins to prevent deleting the last admin
    if (user.rol === 'ADMIN') {
      const adminCount = await this.prisma.user.count({ where: { rol: 'ADMIN', activ: true } });
      if (adminCount <= 1) {
        throw new BadRequestException('Nu puteți șterge ultimul administrator activ al sistemului.');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    // Log in audit
    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId || null,
        userNume: 'Administrator',
        userRol: 'ADMIN',
        actiune: 'STERGERE_UTILIZATOR',
        modul: 'UTILIZATORI',
        entitateTip: 'User',
        entitateId: id,
        detalii: `Șters utilizator: ${user.nume} (${user.email})`,
      },
    });

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
      data: { parola: nouaParola.trim() },
    });

    let actorNume = 'Administrator';
    if (actorUserId) {
      const actor = await this.prisma.user.findUnique({ where: { id: actorUserId } });
      if (actor) actorNume = actor.nume;
    }

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId || null,
        userNume: actorNume,
        userRol: 'ADMIN',
        actiune: 'RESETARE_PAROLA',
        modul: 'UTILIZATORI',
        entitateTip: 'User',
        entitateId: id,
        detalii: `Parola pentru contul "${user.username}" (${user.nume}) a fost resetată de către ${actorNume}.`,
      },
    });

    return { mesaj: `Parola pentru utilizatorul "${user.nume}" a fost resetată cu succes!` };
  }
}
