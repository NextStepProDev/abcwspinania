export interface SessionChoice {
  id: number
  dates: string
  /** "3 wolne", "brak miejsc — lista rezerwowa", "zapytaj o miejsca". */
  spots: string
  full: boolean
  note: string | null
}

/**
 * The dates to choose from on a booking form — a course's sessions or a
 * camp's turnusy. One radio per date; `defaultId` is the date chosen on the
 * way in (`?session=`) or after a failed submit.
 */
export function SessionChoices({
  legend,
  sessions,
  defaultId,
  error,
}: {
  legend: string
  sessions: SessionChoice[]
  defaultId: number | null | undefined
  error?: string
}) {
  return (
    // `min-w-0`: a fieldset is as wide as its content by default, so one
    // long "brak miejsc — lista rezerwowa" pushed the whole form off a
    // phone's screen (found in testing 12.10.2026).
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 font-medium">
        {legend} <span aria-hidden="true">*</span>
      </legend>
      {sessions.map((s) => (
        <label
          key={s.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-rock-200 px-4 py-3 has-[:checked]:border-rope has-[:checked]:bg-rope-soft"
        >
          <input
            type="radio"
            name="sessionId"
            value={s.id}
            defaultChecked={s.id === defaultId}
            className="size-4 shrink-0"
          />
          {/* On a phone the places go under the date — beside it, "1 wolne"
              broke into two lines and the date into three. */}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span>
              <span className="font-medium tabular-nums">{s.dates}</span>
              {s.note && <span className="block text-sm text-rock-600">{s.note}</span>}
            </span>
            <span
              className={`text-sm sm:shrink-0 sm:text-right ${s.full ? 'text-rock-400' : 'text-available-text'}`}
            >
              {s.spots}
            </span>
          </span>
        </label>
      ))}
      {error && <p className="text-sm text-error">{error}</p>}
    </fieldset>
  )
}
