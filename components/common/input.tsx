// The Input component is a reusable UI element that renders a styled input field. It accepts all standard HTML input attributes through props and applies custom styling using the cn utility function. The input field is designed to be full-width, with rounded corners, a border, a semi-transparent background, padding, and specific text styles. It also includes focus styles to enhance the user experience when interacting with the input field. This component can be used throughout the application wherever an input field is needed, ensuring a consistent design and behavior.
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/35 focus:border-emerald-300/30",
        props.className
      )}
    />
  );
}
