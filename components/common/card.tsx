// The Card component is a reusable UI element that renders a styled card with a 3D panel effect. It accepts children as its content and allows for additional HTML attributes to be passed through props. The component uses the cn utility function to conditionally apply CSS classes for styling the card, including rounded corners, borders, background gradients, padding, shadows, and backdrop blur effects. This component can be used throughout the application to maintain a consistent design for card-like elements.
import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "panel-3d rounded-[32px] border border-[#89b494]/20 bg-[linear-gradient(180deg,rgba(7,12,8,0.95),rgba(5,10,7,0.84))] p-6 shadow-glow backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
