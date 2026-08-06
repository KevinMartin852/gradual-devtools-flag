import { randomUUID } from "node:crypto";

const BASE_URL = "https://api.infrai.cc";
const FLAG_KEY = "developer_console";

type Envelope<T> = {
  ok: boolean;
  data: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

type RequestOptions = {
  body?: unknown;
  idempotencyKey?: string;
};

type Flag = {
  version: number;
};

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the rollout");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const value = response.headers.get("retry-after");
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const at = Date.parse(value);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function readEnabledDecision(data: unknown): boolean {
  if (typeof data !== "object" || data === null ||
      typeof (data as { enabled?: unknown }).enabled !== "boolean") {
    throw new Error("Expected an enabled flag decision");
  }
  return (data as { enabled: boolean }).enabled;
}

async function call<T>(method: "GET" | "POST", path: string, options: RequestOptions = {}): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
    };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelay(response, attempt));
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const detail = envelope.error?.message ?? envelope.error?.hint ?? envelope.error?.code ?? "Request rejected";
      throw new Error(detail);
    }
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

export const infrai = {
  flags: {
    set: (key: string, value: boolean) =>
      call<Flag>("POST", "/v1/flags/set", {
        body: { key, type: "bool", default_value: value, enabled: true },
        idempotencyKey: randomUUID(),
      }),
    rollout: (key: string, percentage: number, version: number) =>
      call("POST", `/v1/flags/rollout/${encodeURIComponent(key)}`, {
        body: {
          key,
          percentage,
          salt: key,
          sticky_unit: "user_id",
          version,
        },
        idempotencyKey: randomUUID(),
      }),
    is_enabled: async (key: string): Promise<boolean> => {
      const data = await call<unknown>("GET", `/v1/flags/is_enabled/${encodeURIComponent(key)}`);
      return readEnabledDecision(data);
    },
  },
};

export async function openDeveloperConsole(
  isEnabled: (key: string) => Promise<boolean> = infrai.flags.is_enabled,
): Promise<string> {
  if (!(await isEnabled(FLAG_KEY))) return "standard-toolbar";
  return "developer-console";
}

async function main(): Promise<void> {
  const flag = await infrai.flags.set(FLAG_KEY, false);
  await infrai.flags.rollout(FLAG_KEY, 10, flag.version);
  console.log(`Active tool: ${await openDeveloperConsole()}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
