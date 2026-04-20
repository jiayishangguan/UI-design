// The EmptyState component is a reusable UI element that displays a message when there is no data or content to show. It accepts a title and description as props, which are displayed in a styled card with a dashed border and a semi-transparent background. The title is rendered in a larger font size and the description is shown below it in a smaller, lighter font. This component can be used throughout the application to provide feedback to users when there are no results or when they need to take action to see content.
import { Card } from "@/components/common/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-white/10 bg-white/[0.03] text-center">
      <h3 className="font-serif text-2xl text-white">{title}</h3>
      <p className="mt-3 text-sm text-white/55">{description}</p>
    </Card>
  );
}
