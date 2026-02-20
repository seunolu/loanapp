import * as React from 'react';
import { cn } from './cn';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({ className, label, id, ...props }: TextareaProps): React.JSX.Element {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;

  return (
    <label className="block space-y-1">
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <textarea
        className={cn(
          'min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-300',
          className
        )}
        id={textareaId}
        {...props}
      />
    </label>
  );
}
