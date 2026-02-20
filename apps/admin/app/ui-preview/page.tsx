'use client';

import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { PageShell } from '@/src/ui/PageShell';
import { Select } from '@/src/ui/Select';

export default function UiPreviewPage(): React.JSX.Element {
  return (
    <PageShell
      title="UI Foundation Preview"
      subtitle="Design system primitives for consistent admin interfaces."
      actions={<Button size="sm">Primary Action</Button>}
    >
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Buttons</h2>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading</Button>
          </div>
          <Button fullWidth variant="secondary">
            Full Width
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Form Controls</h2>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input label="Loan ID" placeholder="loan_123456" hint="Enter a valid loan reference." />
          <Input label="Amount" placeholder="150000" error="Amount exceeds configured limit." />
          <Input label="Disabled" placeholder="Unavailable state" disabled />
          <Select label="Repayment Frequency" defaultValue="MONTHLY">
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-base font-semibold">Status Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-mono text-xs text-muted-foreground">loanapp_9f2ac8ce</p>
                <p className="text-sm font-medium">Loan Application Row (Mock)</p>
                <p className="text-xs text-muted-foreground">Submitted on Feb 18, 2026</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">UNDER_REVIEW</Badge>
                <Button size="sm" variant="secondary">
                  Open
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">Preview only. No API calls are made on this page.</CardFooter>
      </Card>
    </PageShell>
  );
}

