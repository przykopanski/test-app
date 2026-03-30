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
  // Ticket status color defaults
  {
    key: 'ticket_status_color_open',
    value: 'green',
    description: 'Farbe fuer Ticket-Status: Offen',
  },
  {
    key: 'ticket_status_color_in_progress',
    value: 'blue',
    description: 'Farbe fuer Ticket-Status: In Bearbeitung',
  },
  {
    key: 'ticket_status_color_resolved',
    value: 'purple',
    description: 'Farbe fuer Ticket-Status: Geloest',
  },
  {
    key: 'ticket_status_color_closed',
    value: 'gray',
    description: 'Farbe fuer Ticket-Status: Geschlossen',
  },
  {
    key: 'ticket_status_color_on_hold',
    value: 'yellow',
    description: 'Farbe fuer Ticket-Status: On Hold',
  },
  // Ticket priority color defaults
  {
    key: 'ticket_priority_color_low',
    value: 'slate',
    description: 'Farbe fuer Ticket-Prioritaet: Niedrig',
  },
  {
    key: 'ticket_priority_color_medium',
    value: 'blue',
    description: 'Farbe fuer Ticket-Prioritaet: Mittel',
  },
  {
    key: 'ticket_priority_color_high',
    value: 'orange',
    description: 'Farbe fuer Ticket-Prioritaet: Hoch',
  },
  {
    key: 'ticket_priority_color_critical',
    value: 'red',
    description: 'Farbe fuer Ticket-Prioritaet: Kritisch',
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
   * Get all color settings as a flat key-value map.
   * Returns only keys matching ticket_status_color_* and ticket_priority_color_*.
   */
  async getColorSettings(): Promise<Record<string, string>> {
    const allSettings = await this.settingsRepo.find({
      order: { key: 'ASC' },
    });

    const result: Record<string, string> = {};
    for (const setting of allSettings) {
      if (
        setting.key.startsWith('ticket_status_color_') ||
        setting.key.startsWith('ticket_priority_color_')
      ) {
        try {
          // Values are stored JSON-serialized (e.g. '"green"'), parse to get plain string
          const parsed = JSON.parse(setting.value);
          result[setting.key] = typeof parsed === 'string' ? parsed : setting.value;
        } catch {
          result[setting.key] = setting.value;
        }
      }
    }
    return result;
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
