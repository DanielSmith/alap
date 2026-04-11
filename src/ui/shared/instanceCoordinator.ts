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

import type { RendererType } from './coordinatedRenderer';

/**
 * Entry for a subscribed instance.
 * Each AlapUI, <alap-link>, or framework <AlapLink> registers one.
 */
interface InstanceEntry {
  type: RendererType;
  close: () => void;
}

/**
 * Global cross-instance coordinator.
 *
 * When any menu instance opens, all other menu instances are closed.
 * This works across adapter boundaries: a DOM AlapUI menu, a
 * <alap-link> web component, and a React <AlapLink> all participate
 * in the same coordinator.
 *
 * Usage:
 *
 *   const coordinator = getInstanceCoordinator();
 *   const unsub = coordinator.subscribe('wc_coffee', 'menu', () => this.closeMenu());
 *   // later, when this instance opens:
 *   coordinator.notifyOpen('wc_coffee');
 *   // on cleanup:
 *   unsub();
 */
export class InstanceCoordinator {
  private instances = new Map<string, InstanceEntry>();

  /**
   * Register an instance. Returns an unsubscribe function.
   *
   * @param id    Unique instance ID (e.g. trigger element ID, or generated)
   * @param type  Renderer type — instances of the same type dismiss each other
   * @param close Callback to close/dismiss this instance
   */
  subscribe(id: string, type: RendererType, close: () => void): () => void {
    this.instances.set(id, { type, close });
    return () => { this.instances.delete(id); };
  }

  /**
   * Notify that the given instance just opened.
   * All other instances of the same type are closed.
   */
  notifyOpen(id: string): void {
    const entry = this.instances.get(id);
    if (!entry) return;
    for (const [otherId, other] of this.instances) {
      if (otherId !== id && other.type === entry.type) {
        other.close();
      }
    }
  }

  /**
   * Close all instances of the given type, or all instances if no type specified.
   */
  closeAll(type?: RendererType): void {
    for (const [, entry] of this.instances) {
      if (!type || entry.type === type) {
        entry.close();
      }
    }
  }

  /** Number of registered instances (for testing). */
  get size(): number {
    return this.instances.size;
  }

  /** Whether a specific instance is registered. */
  has(id: string): boolean {
    return this.instances.has(id);
  }

  /** Full cleanup — remove all subscriptions. */
  destroy(): void {
    this.instances.clear();
  }
}

// --- Singleton ---

let instance: InstanceCoordinator | null = null;

/**
 * Get the global InstanceCoordinator singleton.
 * All adapters (DOM, WC, framework) share this single instance.
 */
export function getInstanceCoordinator(): InstanceCoordinator {
  if (!instance) instance = new InstanceCoordinator();
  return instance;
}

/**
 * Reset the singleton (for testing only).
 * @internal
 */
export function resetInstanceCoordinator(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
