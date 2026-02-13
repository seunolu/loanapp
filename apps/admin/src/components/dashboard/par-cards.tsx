import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ParReport } from '@/src/features/dashboard/api';

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function toCurrency(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function ParCards({ par }: { par: ParReport }) {
  const cards = [
    { label: 'PAR1', amount: par.par1AmountKobo, rate: par.par1Rate },
    { label: 'PAR7', amount: par.par7AmountKobo, rate: par.par7Rate },
    { label: 'PAR30', amount: par.par30AmountKobo, rate: par.par30Rate }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle className="text-sm">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{toCurrency(card.amount)}</div>
            <div className="text-sm text-muted-foreground">{pct(card.rate)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
