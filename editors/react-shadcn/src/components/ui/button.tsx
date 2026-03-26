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

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        destructive: 'shadow-sm hover-lift',
        outline: 'hover-bg-hover',
        secondary: 'hover-opacity',
        ghost: 'hover-bg-hover',
        link: 'underline-offset-4 hover:underline',
        toolbar: 'toolbar-btn',
        accent: 'shadow-lg',
        cancel: 'hover-opacity',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const variantStyles = getVariantStyle(variant ?? 'default');

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{ ...variantStyles, ...style }}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

function getVariantStyle(variant: string): React.CSSProperties {
  switch (variant) {
    case 'default':
      return {
        background: 'var(--alap-accent)',
        color: 'var(--alap-deep)',
      };
    case 'destructive':
      return {
        background: 'var(--alap-danger)',
        color: '#fff',
      };
    case 'outline':
      return {
        background: 'transparent',
        border: '1px solid var(--alap-border-subtle)',
        color: 'var(--alap-text)',
      };
    case 'secondary':
      return {
        background: 'var(--alap-surface)',
        color: 'var(--alap-text)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--alap-text-muted)',
      };
    case 'cancel':
      return {
        background: 'var(--alap-cancel-bg)',
        color: 'var(--alap-cancel-text)',
      };
    case 'accent':
      return {
        background: 'var(--alap-accent)',
        color: 'var(--alap-deep)',
      };
    default:
      return {};
  }
}

export { Button, buttonVariants };
