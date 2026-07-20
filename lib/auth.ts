// Protección de la instancia personal en internet: una sola contraseña
// (RIVER_PASSWORD). Sin esa env var no hay login: la instancia local de
// trabajo queda sin fricción. Sigue siendo single-user (regla 8).

export const AUTH_COOKIE = "river_auth";

// El valor de la cookie es el hash de la contraseña: nunca viaja ni se
// guarda la contraseña en claro. crypto.subtle funciona en Node y en Edge.
export async function expectedToken(password: string) {
  const data = new TextEncoder().encode(`river:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
