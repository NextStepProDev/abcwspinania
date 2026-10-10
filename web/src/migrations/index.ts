import * as migration_20260923_020025_initial from './20260923_020025_initial';
import * as migration_20260923_155756_media_alt_optional from './20260923_155756_media_alt_optional';
import * as migration_20260923_174523_media_gallery_flag from './20260923_174523_media_gallery_flag';
import * as migration_20260923_213302_gallery_photos_collection from './20260923_213302_gallery_photos_collection';
import * as migration_20260924_133009_home_page_hero_image from './20260924_133009_home_page_hero_image';
import * as migration_20260924_223953_camps_page_intro from './20260924_223953_camps_page_intro';
import * as migration_20261002_090000_publish_existing_content from './20261002_090000_publish_existing_content';
import * as migration_20261005_195005_newsletter_pending_status from './20261005_195005_newsletter_pending_status';
import * as migration_20261005_195006_bookings_accounts_broadcasts from './20261005_195006_bookings_accounts_broadcasts';
import * as migration_20261010_152334_bookings_anonymized_at from './20261010_152334_bookings_anonymized_at';
import * as migration_20261010_182558_messages_general_topics from './20261010_182558_messages_general_topics';

export const migrations = [
  {
    up: migration_20260923_020025_initial.up,
    down: migration_20260923_020025_initial.down,
    name: '20260923_020025_initial',
  },
  {
    up: migration_20260923_155756_media_alt_optional.up,
    down: migration_20260923_155756_media_alt_optional.down,
    name: '20260923_155756_media_alt_optional',
  },
  {
    up: migration_20260923_174523_media_gallery_flag.up,
    down: migration_20260923_174523_media_gallery_flag.down,
    name: '20260923_174523_media_gallery_flag',
  },
  {
    up: migration_20260923_213302_gallery_photos_collection.up,
    down: migration_20260923_213302_gallery_photos_collection.down,
    name: '20260923_213302_gallery_photos_collection',
  },
  {
    up: migration_20260924_133009_home_page_hero_image.up,
    down: migration_20260924_133009_home_page_hero_image.down,
    name: '20260924_133009_home_page_hero_image',
  },
  {
    up: migration_20260924_223953_camps_page_intro.up,
    down: migration_20260924_223953_camps_page_intro.down,
    name: '20260924_223953_camps_page_intro',
  },
  {
    up: migration_20261002_090000_publish_existing_content.up,
    down: migration_20261002_090000_publish_existing_content.down,
    name: '20261002_090000_publish_existing_content',
  },
  {
    up: migration_20261005_195005_newsletter_pending_status.up,
    down: migration_20261005_195005_newsletter_pending_status.down,
    name: '20261005_195005_newsletter_pending_status',
  },
  {
    up: migration_20261005_195006_bookings_accounts_broadcasts.up,
    down: migration_20261005_195006_bookings_accounts_broadcasts.down,
    name: '20261005_195006_bookings_accounts_broadcasts',
  },
  {
    up: migration_20261010_152334_bookings_anonymized_at.up,
    down: migration_20261010_152334_bookings_anonymized_at.down,
    name: '20261010_152334_bookings_anonymized_at',
  },
  {
    up: migration_20261010_182558_messages_general_topics.up,
    down: migration_20261010_182558_messages_general_topics.down,
    name: '20261010_182558_messages_general_topics'
  },
];
