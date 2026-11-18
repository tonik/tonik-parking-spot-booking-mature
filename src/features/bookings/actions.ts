"use server"

import { revalidatePath } from "next/cache"

import { isIsoDate } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"

export type BookingFormState =
  | { status: "idle" }
  | {
      status: "error"
      title: string
      description: string
      /** The button the error toast offers as a way out, if any. */
      wayOut?: BookingWayOut
      /** Lets the form show the same error twice in a row. */
      failedAt: number
    }
  | { status: "success"; bookedAt: number }

export type BookingWayOut =
  "showFreeSpaces" | "goToToday" | "startOver" | "retry"

function bookingError(
  title: string,
  description: string,
  wayOut?: BookingWayOut,
): BookingFormState {
  return { status: "error", title, description, wayOut, failedAt: Date.now() }
}

const missingNameOrPlate = () =>
  bookingError(
    "Add a name and a license plate",
    "We need both so others know whose car it is.",
  )

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim()
}

export async function createBooking(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const spotId = Number(formData.get("spotId"))
  const day = formData.get("day")
  const driverName = readText(formData, "driverName")
  const licensePlate = readText(formData, "licensePlate").toUpperCase()
  const note = readText(formData, "note")

  if (!Number.isInteger(spotId) || !isIsoDate(day)) {
    return bookingError(
      "Something went wrong with this booking",
      "Pick a day and a space again.",
      "startOver",
    )
  }
  if (!driverName || !licensePlate) return missingNameOrPlate()

  const supabase = await createClient()
  const { error } = await supabase.from("bookings").insert({
    spot_id: spotId,
    booking_date: day,
    driver_name: driverName,
    license_plate: licensePlate,
    note: note || null,
  })

  if (error?.code === "23505") {
    return bookingError(
      "This space was just booked",
      "Someone got to it a moment before you.",
      "showFreeSpaces",
    )
  }
  // 42501: row-level security refused the insert (the day is in the past).
  if (error?.code === "42501") {
    return bookingError(
      "This day has already passed",
      "You can book from today onwards.",
      "goToToday",
    )
  }
  // 23514: a check constraint failed (weekend).
  if (error?.code === "23514") {
    return bookingError(
      "Weekends can't be booked",
      "Spaces are only for weekdays.",
      "goToToday",
    )
  }
  if (error) {
    return bookingError(
      "We couldn't save your booking",
      "Your details are still here. Check your connection and try again.",
      "retry",
    )
  }

  revalidatePath("/")
  revalidatePath("/bookings")
  return { status: "success", bookedAt: Date.now() }
}

export async function updateBooking(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const bookingId = String(formData.get("bookingId") ?? "")
  const driverName = readText(formData, "driverName")
  const licensePlate = readText(formData, "licensePlate").toUpperCase()
  const note = readText(formData, "note")

  if (!driverName || !licensePlate) return missingNameOrPlate()

  const supabase = await createClient()
  const { error } = await supabase
    .from("bookings")
    .update({
      driver_name: driverName,
      license_plate: licensePlate,
      note: note || null,
    })
    .eq("id", bookingId)

  if (error) {
    return bookingError(
      "We couldn't save your changes",
      "Your edits are still here. Check your connection and try again.",
      "retry",
    )
  }

  revalidatePath("/bookings")
  revalidatePath("/")
  return { status: "success", bookedAt: Date.now() }
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("bookings").delete().eq("id", bookingId)

  if (error) {
    return { ok: false as const }
  }

  revalidatePath("/bookings")
  revalidatePath("/")
  return { ok: true as const }
}
