"use client"

import { useRouter } from "next/navigation"
import {
  startTransition,
  useEffect,
  type FormEvent,
  type RefObject,
} from "react"
import { toast } from "sonner"

import type { BookingFormState, BookingWayOut } from "./actions"

const WAY_OUT_LABELS: Record<BookingWayOut, string> = {
  showFreeSpaces: "Show free spaces",
  goToToday: "Go to today",
  startOver: "Start over",
  retry: "Try again",
}

/**
 * Shows a booking error as a toast, with a button that offers a way out:
 * pick another space, jump to today, start over, or send the form again.
 */
export function useBookingErrorToast(
  state: BookingFormState,
  formRef: RefObject<HTMLFormElement | null>,
  day?: string,
) {
  const router = useRouter()

  useEffect(() => {
    if (state.status !== "error") return

    function takeWayOut(wayOut: BookingWayOut) {
      switch (wayOut) {
        case "showFreeSpaces":
          router.push(day ? `/?day=${day}` : "/")
          break
        case "goToToday":
        case "startOver":
          router.push("/")
          router.refresh()
          break
        case "retry":
          formRef.current?.requestSubmit()
          break
      }
    }

    const { wayOut } = state
    toast(state.title, {
      // One booking error at a time: a new one replaces the last.
      id: "booking-error",
      description: state.description,
      duration: 8000,
      action: wayOut
        ? { label: WAY_OUT_LABELS[wayOut], onClick: () => takeWayOut(wayOut) }
        : undefined,
    })

    // The space was booked by someone else: refresh the grid so it shows
    // as Reserved. The toast lives outside the form, so it stays up.
    if (wayOut === "showFreeSpaces") router.refresh()
  }, [state, formRef, day, router])
}

/**
 * Submit handler that keeps what the person typed when saving fails.
 * With `<form action>`, React clears the fields back to their starting
 * values after every submit, so "Try again" would send the old values.
 */
export function submitKeepingValues(formAction: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => formAction(formData))
  }
}
