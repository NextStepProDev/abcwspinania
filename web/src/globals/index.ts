import type { GlobalConfig } from 'payload'

import { SiteConfig } from './SiteConfig'
import { HomePage } from './HomePage'
import { AboutPage } from './AboutPage'
import { EnglishPage } from './EnglishPage'
import { CampsPage } from './CampsPage'

/** Every global, in panel order — one list for the config and the access test. */
export const globals: GlobalConfig[] = [SiteConfig, HomePage, AboutPage, CampsPage, EnglishPage]
