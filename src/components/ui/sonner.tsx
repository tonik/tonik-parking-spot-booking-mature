"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Toasts styled like the Figma "Toast" component: dark, top right, no icon. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      offset={24}
      icons={{ success: null, info: null, warning: null, error: null }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-80 flex-col gap-1 bg-primary p-6 text-sm text-primary-foreground",
          title: "font-medium",
          description: "text-primary-foreground-muted",
          actionButton:
            "mt-2 self-start cursor-pointer font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
