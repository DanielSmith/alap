/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const BASE_STYLE: React.CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const MONO_STYLE: React.CSSProperties = {
  ...BASE_STYLE,
  fontFamily: "'JetBrains Mono', monospace",
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mono, style, ...props }, ref) => {
    const inputStyle = mono ? MONO_STYLE : BASE_STYLE;

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md px-3 py-1.5 text-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-[var(--alap-text-dim)]',
          'focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        style={{ ...inputStyle, ...style }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
