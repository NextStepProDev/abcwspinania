import * as migration_20260923_020025_initial from './20260923_020025_initial';

export const migrations = [
  {
    up: migration_20260923_020025_initial.up,
    down: migration_20260923_020025_initial.down,
    name: '20260923_020025_initial'
  },
];
