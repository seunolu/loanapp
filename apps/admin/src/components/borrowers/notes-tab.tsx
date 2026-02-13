'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BorrowerDetail } from '@/src/features/borrowers/api';

export function BorrowerNotesTab({
  borrower,
  onAddNote,
  isSaving
}: {
  borrower: BorrowerDetail;
  onAddNote: (note: string) => Promise<void>;
  isSaving: boolean;
}) {
  const [note, setNote] = useState('');

  const submit = async () => {
    const value = note.trim();
    if (!value) {
      return;
    }
    try {
      await onAddNote(value);
      setNote('');
      toast.success('Note added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add note.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add internal note"
          value={note}
        />
        <Button disabled={isSaving} onClick={submit}>
          {isSaving ? 'Saving...' : 'Add'}
        </Button>
      </div>

      <div className="space-y-2">
        {borrower.notes.map((item) => (
          <div className="rounded-md border border-border p-3" key={item.id}>
            <div className="text-sm">{item.note}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString()} • {item.createdById}
            </div>
          </div>
        ))}
        {borrower.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </div>
    </div>
  );
}
