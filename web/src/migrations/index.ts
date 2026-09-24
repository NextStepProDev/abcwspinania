import * as migration_20260923_020025_initial from './20260923_020025_initial';
import * as migration_20260923_155756_media_alt_optional from './20260923_155756_media_alt_optional';
import * as migration_20260923_174523_media_gallery_flag from './20260923_174523_media_gallery_flag';
import * as migration_20260923_213302_gallery_photos_collection from './20260923_213302_gallery_photos_collection';
import * as migration_20260924_133009_home_page_hero_image from './20260924_133009_home_page_hero_image';
import * as migration_20260924_223953_camps_page_intro from './20260924_223953_camps_page_intro';

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
    name: '20260924_223953_camps_page_intro'
  },
];
