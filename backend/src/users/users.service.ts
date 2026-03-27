import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async findAll() {
    const users = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => this.sanitize(u));
  }

  async findActive() {
    const users = await this.usersRepo.find({
      where: { isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');
    return this.sanitize(user);
  }

  async create(dto: CreateUserDto, performedBy: string) {
    const exists = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('E-Mail bereits vergeben');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersRepo.save({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
    });

    await this.auditRepo.save({
      userId: performedBy,
      action: AuditAction.USER_CREATED,
      metadata: { targetUserId: user.id, email: user.email },
    });

    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, performedBy: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');

    const oldRole = user.role;

    // Letzter-Admin-Schutz: Rollenwechsel weg von Admin prüfen
    if (
      dto.role !== undefined &&
      dto.role !== UserRole.ADMIN &&
      user.role === UserRole.ADMIN
    ) {
      const activeAdmins = await this.usersRepo.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException(
          'Rolle kann nicht geändert werden — mindestens ein Admin muss existieren',
        );
      }
    }

    // Letzter-Admin-Schutz: Deaktivierung eines Admins prüfen
    if (
      dto.isActive === false &&
      user.role === UserRole.ADMIN &&
      user.isActive
    ) {
      const activeAdmins = await this.usersRepo.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException(
          'Letzten Admin kann man nicht deaktivieren',
        );
      }
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      await this.auditRepo.save({
        userId: performedBy,
        action: AuditAction.PASSWORD_CHANGED,
        metadata: { targetUserId: id },
      });
    }

    if (dto.role && dto.role !== oldRole) {
      await this.auditRepo.save({
        userId: performedBy,
        action: AuditAction.ROLE_CHANGED,
        metadata: { targetUserId: id, oldRole, newRole: dto.role },
      });
    }

    await this.usersRepo.save(user);

    await this.auditRepo.save({
      userId: performedBy,
      action: AuditAction.USER_UPDATED,
      metadata: { targetUserId: id },
    });

    return this.sanitize(user);
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Aktuelles Passwort ist falsch');
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepo.save(user);

    await this.auditRepo.save({
      userId: id,
      action: AuditAction.PASSWORD_CHANGED,
      metadata: { targetUserId: id },
    });

    return this.sanitize(user);
  }

  async deactivate(id: string, performedBy: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');

    // Prüfen: mindestens 1 Admin muss aktiv bleiben
    if (user.role === UserRole.ADMIN) {
      const activeAdmins = await this.usersRepo.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException(
          'Letzten Admin kann man nicht deaktivieren',
        );
      }
    }

    user.isActive = false;
    await this.usersRepo.save(user);

    await this.auditRepo.save({
      userId: performedBy,
      action: AuditAction.USER_DEACTIVATED,
      metadata: { targetUserId: id },
    });

    return this.sanitize(user);
  }

  private sanitize(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
