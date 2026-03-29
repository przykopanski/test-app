import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { TimeEntriesModule } from './time-entries/time-entries.module.js';
import { SystemSettingsModule } from './system-settings/system-settings.module.js';
import { VatRatesModule } from './vat-rates/vat-rates.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { ServiceReportsModule } from './service-reports/service-reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'ticketsystem'),
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    CustomersModule,
    TicketsModule,
    TimeEntriesModule,
    SystemSettingsModule,
    VatRatesModule,
    MaterialsModule,
    ServiceReportsModule,
  ],
})
export class AppModule {}
