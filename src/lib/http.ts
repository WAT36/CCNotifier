import { HTTP_TIMEOUT_MS } from './constant';

// fetch()には標準でタイムアウトがなく、外部APIが無応答だと処理が長時間ハングするため明示的に打ち切る
export const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeoutMs: number = HTTP_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};
