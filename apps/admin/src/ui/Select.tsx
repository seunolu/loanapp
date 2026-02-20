import * as React from 'react';
import { cn } from './cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, error, hint, className, children, ...props },
  ref
) {
  const selectId = id ?? React.useId();
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-sm font-medium text-foreground" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors',
          error ? 'border-destructive' : 'border-input focus:border-primary',
          props.disabled ? 'opacity-60' : '',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
});

