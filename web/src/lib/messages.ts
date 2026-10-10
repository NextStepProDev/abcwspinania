/**
 * Contact-message statuses — one list for the collection's field and the
 * status select in the panel's list (`MessageStatusCell`). Pure, no imports.
 */
export const MESSAGE_STATUS_OPTIONS = [
  { label: 'nowa', value: 'new' },
  { label: 'w toku', value: 'in-progress' },
  { label: 'załatwiona', value: 'resolved' },
] as const
