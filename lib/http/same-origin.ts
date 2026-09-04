/**
 * Mitigacao simples contra CSRF via navegador: sem login/cookie de sessao
 * (uso local, single-user), qualquer site aberto no mesmo navegador
 * poderia tentar um POST pra localhost:PORTA. Se o header Origin vier e nao
 * bater com o host da propria requisicao, rejeita. Sem Origin (alguns
 * clientes nao mandam em same-origin), deixa passar.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
