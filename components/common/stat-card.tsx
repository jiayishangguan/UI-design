// The StatCard component is a reusable UI element that displays a statistic with a label, value, helper text, and an optional accent. It uses the Card component to create a styled container for the content. The label is displayed in a smaller font size with reduced opacity, while the value is shown in a larger, more prominent font. If an accent is provided, it is displayed below the value in uppercase letters with specific styling. The helper text is shown at the bottom of the card in a smaller font size with reduced opacity. This component can be used throughout the application to display various statistics in a consistent and visually appealing manner.
import { Card } from "@/components/common/card";

export function StatCard({
  label,
  value,
  helper,
  accent
}: {
  label: string;
  value: string;
  helper: string;
  accent?: string;
}) {
  return (
    <Card className="min-h-44 animate-fade-up">
      <p className="text-sm text-white/55">{label}</p>
      <p className="mt-8 font-serif text-5xl text-white">{value}</p>
      {accent ? <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#98c7a5]">{accent}</p> : null}
      <p className="mt-4 text-sm text-white/50">{helper}</p>
    </Card>
  );
}
