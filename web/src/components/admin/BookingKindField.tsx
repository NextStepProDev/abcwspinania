'use client'

import { useEffect } from 'react'
import { SelectField, useDocumentInfo, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'

import { LAST_LIST_KIND_KEY, kindForNewBooking } from '@/lib/bookingsList'

/**
 * "Rodzaj zapisu" — Payload's own select, plus one thing: a NEW booking
 * starts as the half of the list the school came from (`BookingsListDescription`
 * remembers it). "Stwórz nowy" on the camp list opened a course booking, and
 * a phone booking for a child needed the kind switched by hand first.
 * An existing booking, a duplicate included, keeps its kind.
 */
export const BookingKindField: SelectFieldClientComponent = (props) => {
  const { id } = useDocumentInfo()
  const { value, setValue } = useField<string>({ path: props.path ?? props.field.name })

  useEffect(() => {
    let remembered: string | null = null
    try {
      remembered = window.sessionStorage.getItem(LAST_LIST_KIND_KEY)
    } catch {
      // Storage blocked: the form starts at the default, as before.
    }
    const kind = kindForNewBooking(!id, remembered, value)
    if (kind) setValue(kind)
    // Once, when the form opens — not on every change of the select.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return <SelectField {...props} />
}
