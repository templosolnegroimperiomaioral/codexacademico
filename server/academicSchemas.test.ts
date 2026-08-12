import { describe, expect, it } from "vitest";
import { eventInput, materialLinkInput, materialUploadInput, notificationReviewInput, subjectInput, taskInput } from "./academicSchemas";

describe("validações acadêmicas", () => {
  it("normaliza dados opcionais de uma disciplina", () => {
    const subject = subjectInput.parse({ name: "  Direito Civil III  ", professor: "  ", color: "#C9A66B" });
    expect(subject).toMatchObject({ name: "Direito Civil III", professor: undefined, color: "#C9A66B" });
  });

  it("rejeita uma cor de disciplina fora do padrão hexadecimal", () => {
    expect(() => subjectInput.parse({ name: "Civil", color: "azul" })).toThrow();
  });

  it("mantém datas de eventos e tarefas como milissegundos UTC", () => {
    const instant = Date.UTC(2026, 7, 18, 13, 0, 0);
    expect(eventInput.parse({ title: "Prova P1", startsAt: instant }).startsAt).toBe(instant);
    expect(taskInput.parse({ title: "Ler ADI 4277", dueAt: instant }).dueAt).toBe(instant);
  });

  it("aceita os tipos de Evento Acadêmico previstos pelo PDD", () => {
    const instant = Date.UTC(2026, 7, 18, 13, 0, 0);
    expect(eventInput.parse({ title: "Seminário", type: "seminar", startsAt: instant }).type).toBe("seminar");
    expect(eventInput.parse({ title: "Leitura obrigatória", type: "reading", startsAt: instant }).type).toBe("reading");
    expect(eventInput.parse({ title: "Audiência", type: "hearing", startsAt: instant }).type).toBe("hearing");
  });

  it("aceita somente URLs completas para materiais por link", () => {
    expect(materialLinkInput.parse({ subjectId: 1, title: "Texto-base", url: "https://example.org/texto" }).url).toBe("https://example.org/texto");
    expect(() => materialLinkInput.parse({ subjectId: 1, title: "Texto-base", url: "arquivo.pdf" })).toThrow();
  });

  it("exige metadados e conteúdo para arquivos enviados às disciplinas", () => {
    expect(materialUploadInput.parse({ subjectId: 1, title: "Aula 03", filename: "aula-03.pdf", contentType: "application/pdf", contentBase64: "YQ==" }).filename).toBe("aula-03.pdf");
    expect(() => materialUploadInput.parse({ subjectId: 1, title: "Aula 03", filename: "", contentType: "application/pdf", contentBase64: "YQ==" })).toThrow();
  });

  it("permite apenas decisões explícitas na revisão de avisos importados", () => {
    expect(notificationReviewInput.parse({ id: 3, reviewStatus: "approved" })).toEqual({ id: 3, reviewStatus: "approved" });
    expect(() => notificationReviewInput.parse({ id: 3, reviewStatus: "pending" })).toThrow();
  });
});
