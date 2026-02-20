import * as React from 'react';
import { cn } from './cn';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, className, leftIcon, rightSlot, ...props },
  ref
) {
  const inputId = id ?? React.useId();
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-sm font-medium text-foreground" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          'flex h-11 items-center rounded-lg border bg-background px-3 transition-colors',
          error ? 'border-destructive' : 'border-input',
          props.disabled ? 'opacity-60' : 'focus-within:border-primary'
        )}
      >
        {leftIcon ? <span className="mr-2 text-muted-foreground">{leftIcon}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none',
            className
          )}
          {...props}
        />
        {rightSlot ? <span className="ml-2">{rightSlot}</span> : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
});

