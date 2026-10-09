import { EngineSnapshot, AppConfig, AnalysisSnapshot } from '../types/helix';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // not JSON
    }

    if (!res.ok) {
      throw new Error(json?.error || json?.detail || `HTTP ${res.status}: ${res.statusText}`);
    }

    return json as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Backend-Timeout (9s überschritten)');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const helixApi = {
  async getState(): Promise<EngineSnapshot> {
    return request<EngineSnapshot>('/api/state');
  },

  async getConfig(): Promise<AppConfig> {
    return request<AppConfig>('/api/config');
  },

  async updateConfig(newConfig: Partial<AppConfig>): Promise<{ ok: boolean; config: AppConfig }> {
    return request('/api/config', {
      method: 'PUT',
      body: JSON.stringify(newConfig)
    });
  },

  async control(action: 'arm' | 'disarm' | 'pause' | 'resume' | 'kill' | 'set_mode' | 'toggle_autotrade', mode?: string): Promise<{ ok: boolean; state: EngineSnapshot }> {
    return request('/api/control', {
      method: 'POST',
      body: JSON.stringify({ action, mode })
    });
  },

  async setStrategy(strategy: string): Promise<{ ok: boolean; strategy: string }> {
    return request('/api/strategy', {
      method: 'POST',
      body: JSON.stringify({ strategy })
    });
  },

  async setPreset(preset: 'safe_slow' | 'normal' | 'aggressive'): Promise<{ ok: boolean; preset: string; config: AppConfig }> {
    return request('/api/preset', {
      method: 'POST',
      body: JSON.stringify({ preset })
    });
  },

  async savePresetStrategy(preset: string, strategy: string, config: any): Promise<any> {
    return request('/api/preset/save-strategy', {
      method: 'POST',
      body: JSON.stringify({ preset, strategy, config })
    });
  },

  async toggleMultiStrategies(strategies: string[]): Promise<{ ok: boolean; active_strategies: string[] }> {
    return request('/api/strategy/multi-toggle', {
      method: 'POST',
      body: JSON.stringify({ strategies })
    });
  },

  async paperBuy(params: { mint: string; symbol: string; amount_sol: number; strategy?: string; route?: string }) {
    return request('/api/paper/buy', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async paperExit(position_id: string, reason = 'MANUAL_SELL') {
    return request('/api/paper/exit', {
      method: 'POST',
      body: JSON.stringify({ position_id, reason })
    });
  },

  async paperReset() {
    return request('/api/paper/reset', {
      method: 'POST'
    });
  },

  async emergencyStop() {
    return request('/api/emergency/stop', {
      method: 'POST'
    });
  },

  async emergencyCloseAll() {
    return request('/api/emergency/close-all', {
      method: 'POST'
    });
  },

  async runBacktest(params: { strategy?: string; params?: any; trade_amount_sol?: number; starting_sol?: number }) {
    return request('/api/backtest/run', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async setPrivateKey(private_key: string): Promise<{ ok: boolean; address: string; ready: boolean }> {
    return request('/api/config/private-key', {
      method: 'POST',
      body: JSON.stringify({ private_key })
    });
  },

  async getLiveStatus() {
    return request<{
      ready: boolean;
      public_key?: string;
      balance_sol: number;
      network: string;
      rpc_url: string;
      priority_fee_sol: number;
      max_slippage_pct: number;
    }>('/api/live/status');
  },

  async liveBuy(params: { mint: string; symbol: string; amount_sol: number; slippage_pct?: number; priority_fee_sol?: number }) {
    return request('/api/live/buy', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async liveSell(params: { mint: string; amount_tokens?: number; slippage_pct?: number; priority_fee_sol?: number }) {
    return request('/api/live/sell', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async verifyWallet(address: string) {
    return request<{ ok: boolean; address: string; valid: boolean }>('/api/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
  },

  async testTelegram(bot_token: string, chat_id: string) {
    return request<{ ok: boolean; message: string }>('/api/telegram/test', {
      method: 'POST',
      body: JSON.stringify({ bot_token, chat_id })
    });
  },

  async updateTelegramConfig(config: { bot_token?: string; chat_id?: string; enabled?: boolean }) {
    return request('/api/telegram/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async getAnalysis(): Promise<AnalysisSnapshot> {
    return request<AnalysisSnapshot>('/api/analysis');
  },

  async pingRpc(): Promise<{ ok: boolean; latency_ms: number; sol_price_usd?: number }> {
    return request('/api/rpc/ping');
  },

  async getSystemDiagnostics() {
    return request('/api/diagnostics/system');
  }
};
