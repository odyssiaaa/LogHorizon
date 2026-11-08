export async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(body);
  } catch {
    const message = response.status >= 500
      ? `${fallback} Server bermasalah; periksa koneksi database dan log server.`
      : `${fallback} Respons server tidak valid.`;
    throw new Error(message);
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : fallback;
    throw new Error(message);
  }
  return payload as T;
}
