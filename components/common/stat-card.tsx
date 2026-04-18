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
