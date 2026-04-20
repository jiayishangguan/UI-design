// The Textarea component is a reusable UI element that renders a styled textarea input field. It accepts all standard HTML textarea attributes through props and applies custom styling using the cn utility function. The textarea is designed to be full-width, with a minimum height, rounded corners, a border, a semi-transparent background, padding, and specific text styles. It also includes focus styles to enhance the user experience when interacting with the textarea. This component can be used throughout the application wherever a multiline input field is needed, ensuring a consistent design and behavior.
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/30",
        props.className
      )}
    />
  );
}
