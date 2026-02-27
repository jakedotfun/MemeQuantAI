const API_BASE = "http://localhost:3001/api";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

const api = {
  // Health
  health: () => request("/health"),

  // Wallet
  createWallet: (userAddress: string) =>
    request("/wallet/create", {
      method: "POST",
      body: JSON.stringify({ userAddress }),
    }),
  getWallet: (userAddress: string) => request(`/wallet/${userAddress}`),
  getBalance: (userAddress: string) => request(`/wallet/balance/${userAddress}`),
  exportPrivateKey: (userAddress: string) =>
    request("/wallet/export-key", {
      method: "POST",
      body: JSON.stringify({ userAddress, confirmExport: true }),
    }),

  // Chat / Trade
  chat: (userAddress: string, message: string) =>
    request("/trade/chat", {
      method: "POST",
      body: JSON.stringify({ userAddress, message }),
    }),

  // Portfolio
  getPortfolio: (userAddress: string) => request(`/portfolio/${userAddress}`),
  getTradeHistory: (userAddress: string, limit = 50) =>
    request(`/portfolio/${userAddress}/history?limit=${limit}`),

  // Automations
  getPlaybooks: () => request("/automation/playbooks"),
  getUserAutomations: (userAddress: string) =>
    request(`/automation/${userAddress}`),
  activatePlaybook: (
    userAddress: string,
    playbookId: string,
    customParams = {}
  ) =>
    request("/automation/activate", {
      method: "POST",
      body: JSON.stringify({ userAddress, playbookId, customParams }),
    }),
  deactivatePlaybook: (userAddress: string, playbookId: string) =>
    request("/automation/deactivate", {
      method: "POST",
      body: JSON.stringify({ userAddress, playbookId }),
    }),
  getActivityLog: (userAddress: string, limit = 50) =>
    request(`/automation/activity/${userAddress}?limit=${limit}`),

  // Monitoring
  startMonitor: (userAddress: string) =>
    request("/automation/start-monitor", {
      method: "POST",
      body: JSON.stringify({ userAddress }),
    }),
  stopMonitor: () =>
    request("/automation/stop-monitor", { method: "POST" }),
};

export default api;
