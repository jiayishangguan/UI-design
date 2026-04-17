import { Card } from "@/components/common/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-white/10 bg-white/[0.03] text-center">
      <h3 className="font-serif text-2xl text-white">{title}</h3>
      <p className="mt-3 text-sm text-white/55">{description}</p>
    </Card>
  );
}
