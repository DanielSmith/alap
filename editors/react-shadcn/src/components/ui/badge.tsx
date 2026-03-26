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

import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-[11px] font-medium transition-all',
  {
    variants: {
      variant: {
        default: 'tag-pill',
        secondary: '',
        outline: '',
        pattern: 'hover-bg-pattern cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  const variantStyle = getVariantStyle(variant ?? 'default');

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{ ...variantStyle, ...style }}
      {...props}
    />
  );
}

function getVariantStyle(variant: string): React.CSSProperties {
  switch (variant) {
    case 'secondary':
      return {
        background: 'var(--alap-surface)',
        color: 'var(--alap-text-muted)',
        padding: '1px 8px',
        border: '1px solid var(--alap-border-subtle)',
      };
    case 'outline':
      return {
        background: 'transparent',
        color: 'var(--alap-text-muted)',
        padding: '1px 8px',
        border: '1px solid var(--alap-border-subtle)',
      };
    case 'pattern':
      return {
        padding: '2px 8px',
        borderRadius: '9999px',
        border: '1px solid var(--alap-pattern-border)',
      };
    default:
      return {};
  }
}

export { Badge, badgeVariants };
