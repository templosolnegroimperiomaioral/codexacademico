import { extractLessonTopicCandidate } from "./googleIntegration";
import { describe, expect, it } from "vitest";

describe("detecção de conteúdos previstos por e-mail", () => {
  it("extrai um tema declarado explicitamente no e-mail", () => {
    const topic = extractLessonTopicCandidate("Direito Civil VIII — Conteúdo da aula: Inventário, partilha e testamento.");
    expect(topic).toBe("Inventário, partilha e testamento");
  });

  it("não transforma um e-mail acadêmico genérico em assunto de aula", () => {
    const topic = extractLessonTopicCandidate("Prezados alunos, a aula ocorrerá no horário habitual. Atenciosamente.");
    expect(topic).toBeUndefined();
  });

  it("aceita o sinal de plano de aula sem inferir a disciplina", () => {
    const topic = extractLessonTopicCandidate("Plano de aula: Controle de constitucionalidade concentrado");
    expect(topic).toBe("Controle de constitucionalidade concentrado");
  });
});
