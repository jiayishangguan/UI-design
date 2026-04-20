// The Dialog component is a reusable UI element that renders a modal dialog box on the screen. It accepts props to control its visibility (open), title, description, and children content. When the open prop is true, the dialog is displayed as a centered overlay with a semi-transparent background. The dialog box itself is styled with rounded corners, borders, background color, padding, and shadow effects to create a visually appealing design. The title and description are displayed at the top of the dialog, while the children content is rendered below them. This component can be used throughout the application to display various types of dialogs, such as alerts, confirmations, or forms.
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export function Dialog({
  open,
  title,
  description,
  children
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
}>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className={cn("w-full max-w-xl rounded-[32px] border border-white/10 bg-[#07110a] p-8 shadow-glow")}>
        <h2 className="font-serif text-3xl text-white">{title}</h2>
        {description ? <p className="mt-3 text-sm text-white/60">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
