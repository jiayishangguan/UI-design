// The Select component is a reusable UI element that renders a styled select dropdown. It accepts all standard HTML select attributes through props and applies custom styling using the cn utility function. The component also includes a normalizeChildren function that recursively processes the children of the select element, applying specific styles to option and optgroup elements based on their disabled state. This ensures that disabled options are visually distinct from enabled ones. The Select component can be used throughout the application wherever a dropdown selection is needed, providing a consistent design and behavior.
import { Children, cloneElement, isValidElement } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const normalizeChildren = (children: ReactNode): ReactNode =>
    Children.map(children, (child) => {
      if (!isValidElement(child)) {
        return child;
      }

      if (child.type === "option") {
        const style = {
          color: child.props.disabled ? "#7b837c" : "#111111",
          backgroundColor: "#ffffff",
          ...(child.props.style ?? {})
        };

        return cloneElement(child, { style });
      }

      if (child.type === "optgroup") {
        return cloneElement(child, {
          style: {
            color: "#4b5563",
            backgroundColor: "#ffffff",
            ...(child.props.style ?? {})
          },
          children: normalizeChildren(child.props.children)
        });
      }

      return child;
    });

  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-[#0b120d] px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/30",
        props.className
      )}
    >
      {normalizeChildren(props.children)}
    </select>
  );
}
