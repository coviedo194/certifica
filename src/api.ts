export async function api<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('El servidor no devolvió una respuesta válida. Comprueba que está en ejecución.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Error HTTP ${response.status}`);
  return data as T;
}
