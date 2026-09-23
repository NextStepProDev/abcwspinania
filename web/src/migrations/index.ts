import * as migration_20260923_020025_initial from './20260923_020025_initial';
import * as migration_20260923_155756_media_alt_optional from './20260923_155756_media_alt_optional';
import * as migration_20260923_174523_media_gallery_flag from './20260923_174523_media_gallery_flag';

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
    name: '20260923_174523_media_gallery_flag'
  },
];
