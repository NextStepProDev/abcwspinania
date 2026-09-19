import * as migration_20260919_085401_initial from './20260919_085401_initial';
import * as migration_20260919_094734_wiadomosci from './20260919_094734_wiadomosci';

export const migrations = [
  {
    up: migration_20260919_085401_initial.up,
    down: migration_20260919_085401_initial.down,
    name: '20260919_085401_initial',
  },
  {
    up: migration_20260919_094734_wiadomosci.up,
    down: migration_20260919_094734_wiadomosci.down,
    name: '20260919_094734_wiadomosci'
  },
];
