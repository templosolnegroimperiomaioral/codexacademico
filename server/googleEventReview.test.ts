import { describe, expect, it } from "vitest";
import { shouldPromoteCalendarCandidate, shouldPromoteClassroomTask, shouldPromoteGmailTask } from "./googleIntegration";

describe("revisão de candidatos do Google Calendar", () => {
  const candidate = {
    source: "calendar",
    subjectId: 7,
    detectedStartsAt: 1_785_962_400_000,
    externalId: "calendar:evento-1",
  };

  it("só promove um compromisso quando o estudante o aprova", () => {
    expect(shouldPromoteCalendarCandidate(candidate, "approved")).toBe(true);
    expect(shouldPromoteCalendarCandidate(candidate, "dismissed")).toBe(false);
  });

  it("não promove avisos sem disciplina, horário ou identificador externo", () => {
    expect(shouldPromoteCalendarCandidate({ ...candidate, subjectId: null }, "approved")).toBe(false);
    expect(shouldPromoteCalendarCandidate({ ...candidate, detectedStartsAt: null }, "approved")).toBe(false);
    expect(shouldPromoteCalendarCandidate({ ...candidate, externalId: null }, "approved")).toBe(false);
  });

  it("não promove e-mails ou avisos do Classroom para a agenda", () => {
    expect(shouldPromoteCalendarCandidate({ ...candidate, source: "gmail" }, "approved")).toBe(false);
    expect(shouldPromoteCalendarCandidate({ ...candidate, source: "classroom" }, "approved")).toBe(false);
  });
});

describe("revisão de atividades do Google Classroom", () => {
  const candidate = { source: "classroom", subjectId: 8, externalId: "classroom:curso:trabalho" };

  it("só cria tarefa depois da aprovação explícita", () => {
    expect(shouldPromoteClassroomTask(candidate, "approved")).toBe(true);
    expect(shouldPromoteClassroomTask(candidate, "dismissed")).toBe(false);
  });

  it("não cria tarefa para fontes ou referências inválidas", () => {
    expect(shouldPromoteClassroomTask({ ...candidate, source: "gmail" }, "approved")).toBe(false);
    expect(shouldPromoteClassroomTask({ ...candidate, subjectId: null }, "approved")).toBe(false);
    expect(shouldPromoteClassroomTask({ ...candidate, externalId: null }, "approved")).toBe(false);
  });
});

describe("revisão de e-mails acadêmicos", () => {
  const candidate = { source: "gmail", subjectId: 5, externalId: "gmail:mensagem-1" };

  it("só cria uma tarefa de acompanhamento após aprovação explícita", () => {
    expect(shouldPromoteGmailTask(candidate, "approved")).toBe(true);
    expect(shouldPromoteGmailTask(candidate, "dismissed")).toBe(false);
  });

  it("não promove e-mails sem disciplina ou referência externa", () => {
    expect(shouldPromoteGmailTask({ ...candidate, subjectId: null }, "approved")).toBe(false);
    expect(shouldPromoteGmailTask({ ...candidate, externalId: null }, "approved")).toBe(false);
    expect(shouldPromoteGmailTask({ ...candidate, source: "calendar" }, "approved")).toBe(false);
  });
});
