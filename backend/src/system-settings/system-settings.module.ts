import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../entities/system-setting.entity.js';
import { SystemSettingsController } from './system-settings.controller.js';
import { ColorSettingsController } from './color-settings.controller.js';
import { SystemSettingsService } from './system-settings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  controllers: [SystemSettingsController, ColorSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
