import type { CollectionConfig } from 'payload'

import { Users } from './Users'
import { Media } from './Media'
import { GalleryPhotos } from './GalleryPhotos'
import { Courses } from './Courses'
import { Camps } from './Camps'
import { Sessions } from './Sessions'
import { Posts } from './Posts'
import { Testimonials } from './Testimonials'
import { Instructors } from './Instructors'
import { Messages } from './Messages'
import { Newsletter } from './Newsletter'

/**
 * Every collection, in the order the panel lists them.
 *
 * One list for `payload.config.ts` AND for `lib/access.test.ts`: a collection
 * added here is checked for explicit access rules without anyone remembering
 * to add it to the test as well.
 */
export const collections: CollectionConfig[] = [
  Courses,
  Camps,
  Sessions,
  Posts,
  Testimonials,
  Instructors,
  Media,
  GalleryPhotos,
  Messages,
  Newsletter,
  Users,
]
