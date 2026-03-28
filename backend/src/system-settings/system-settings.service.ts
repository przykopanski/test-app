import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity.js';

interface DefaultSetting {
  key: string;
  value: unknown;
  description: string;
}

const DEFAULT_SETTINGS: DefaultSetting[] = [
  {
    key: 'gap_detection_enabled',
    value: true,
    description: 'Aktiviert die Erkennung von Luecken zwischen Zeiteintraegen im Tages-Dashboard',
  },
  {
    key: 'gap_threshold_minutes',
    value: 30,
    description: 'Mindestdauer in Minuten, ab der eine Luecke zwischen Zeiteintraegen angezeigt wird',
  },
];

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepo: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  /**
   * Get a setting by key. Returns the parsed JSON value, or null if not found.
   */
  async get(key: string): Promise<unknown> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) return null;
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  }

  /**
   * Upsert a setting. The value is JSON-serialized before storage.
   */
  async set(key: string, value: unknown, description?: string): Promise<void> {
    const existing = await this.settingsRepo.findOne({ where: { key } });
    if (existing) {
      existing.value = JSON.stringify(value);
      if (description !== undefined) {
        existing.description = description;
      }
      await this.settingsRepo.save(existing);
    } else {
      const setting = this.settingsRepo.create({
        key,
        value: JSON.stringify(value),
        description: description ?? null,
      });
      await this.settingsRepo.save(setting);
    }
  }

  /**
   * List all settings.
   */
  async getAll(): Promise<SystemSetting[]> {
    return this.settingsRepo.find({ order: { key: 'ASC' } });
  }

  /**
   * Seed default settings if they do not exist yet.
   */
  async seedDefaults(): Promise<void> {
    for (const def of DEFAULT_SETTINGS) {
      const exists = await this.settingsRepo.findOne({ where: { key: def.key } });
      if (!exists) {
        this.logger.log(`Seeding default setting: ${def.key} = ${JSON.stringify(def.value)}`);
        await this.settingsRepo.save(
          this.settingsRepo.create({
            key: def.key,
            value: JSON.stringify(def.value),
            description: def.description,
          }),
        );
      }
    }
  }
}
