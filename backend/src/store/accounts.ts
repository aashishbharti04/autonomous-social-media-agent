import { v4 as uuid } from 'uuid';
import type { AccountView, ConnectedAccount, Platform } from '../types.js';
import { JsonStore } from './json-store.js';

export interface ConnectAccountInput {
  platform: Platform;
  handle: string;
  label: string;
  accessToken?: string;
}

/**
 * Store of client social accounts to automate. Persisted to data/accounts.json.
 * Tokens are kept here but never leave the server — use `view()` for responses.
 */
class AccountStore {
  private store = new JsonStore<ConnectedAccount[]>('accounts.json', []);
  private accounts: ConnectedAccount[] = this.store.read();

  list(): AccountView[] {
    return this.accounts
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(view);
  }

  get(id: string): ConnectedAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  connect(input: ConnectAccountInput): AccountView {
    const account: ConnectedAccount = {
      id: uuid(),
      platform: input.platform,
      handle: input.handle.startsWith('@') ? input.handle : `@${input.handle}`,
      label: input.label,
      active: true,
      accessToken: input.accessToken ?? '',
      createdAt: new Date().toISOString(),
    };
    this.accounts.push(account);
    this.persist();
    return view(account);
  }

  update(
    id: string,
    patch: Partial<Pick<ConnectedAccount, 'label' | 'handle' | 'active' | 'accessToken'>>,
  ): AccountView | undefined {
    const account = this.get(id);
    if (!account) return undefined;
    Object.assign(account, patch);
    this.persist();
    return view(account);
  }

  remove(id: string): boolean {
    const before = this.accounts.length;
    this.accounts = this.accounts.filter((a) => a.id !== id);
    if (this.accounts.length === before) return false;
    this.persist();
    return true;
  }

  private persist(): void {
    this.store.write(this.accounts);
  }
}

function view(a: ConnectedAccount): AccountView {
  const connected = a.accessToken.length > 0;
  return {
    id: a.id,
    platform: a.platform,
    handle: a.handle,
    label: a.label,
    active: a.active,
    connected,
    tokenMasked: connected ? `••••••${a.accessToken.slice(-2)}` : 'demo (mock)',
    createdAt: a.createdAt,
  };
}

export const accountStore = new AccountStore();
