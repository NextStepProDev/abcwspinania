/**
 * Contact form enquiry topics — ONE source.
 *
 * The same list is needed in three places: as the options of a field in the
 * `Messages` collection, as the set of accepted values in server-side
 * validation, and as the `<select>` options in the form. Kept separately in
 * each, it drifts apart the first time an entry is added, and that only shows
 * once somebody picks the new option and gets a save error.
 *
 * This file is pure — no imports from Payload or Next — so that both the client
 * form and validation run under bare `node --test` can import it.
 */
/**
 * General on purpose (decided 10.10.2026). Until then this list named the
 * courses, copied from the mockup before courses lived in the panel: two were
 * missing and three were named differently from the offer, and a course
 * added in the panel never reached the form. Now "Kurs" asks which one in a
 * second field filled from the panel (`Messages.course`); camps get their own
 * booking form in stage 4.
 */
export const TOPICS = [
  { value: 'course', label: 'Kurs' },
  { value: 'camp', label: 'Obóz lub wyjazd' },
  { value: 'other', label: 'Inna sprawa' },
] as const

export type TopicValue = (typeof TOPICS)[number]['value']

export const TOPIC_VALUES: readonly string[] = TOPICS.map((t) => t.value)

/** The shape a Payload `select` field expects in a collection config. */
export const TOPICS_FOR_PAYLOAD = TOPICS.map((t) => ({ label: t.label, value: t.value }))
