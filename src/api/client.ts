const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface RequestOptions {
  params?: Record<string, string>;
  signal?: AbortSignal;
}

export async function apiGet<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(path, API_BASE_URL);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
