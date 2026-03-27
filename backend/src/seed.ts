import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { User, UserRole } from './entities/user.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { AuditLog } from './entities/audit-log.entity.js';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'ticketsystem',
  entities: [User, RefreshToken, AuditLog],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Datenbank verbunden.');

  const usersRepo = dataSource.getRepository(User);

  const existingAdmin = await usersRepo.findOne({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('Admin-User existiert bereits. Seed übersprungen.');
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 12);

  await usersRepo.save({
    email: 'admin@example.com',
    passwordHash,
    firstName: 'System',
    lastName: 'Admin',
    role: UserRole.ADMIN,
    isActive: true,
  });

  console.log('Admin-User erstellt: admin@example.com / admin123');
  console.log('⚠️  Bitte Passwort nach dem ersten Login ändern!');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed fehlgeschlagen:', err);
  process.exit(1);
});
