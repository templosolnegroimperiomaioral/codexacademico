export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Inicia a autenticação da própria aplicação. A rota do servidor cria e valida
 * o estado OAuth; o navegador nunca recebe segredo nem precisa conhecer o
 * provedor de infraestrutura utilizado na publicação.
 */
export const startLogin = () => {
  window.location.assign("/api/auth/google/start");
};
