import { describe, expect, it } from "vitest";
import { filterInboxNotices, hasPendingInboxReview } from "./noticeInbox";

describe("caixa de avisos por disciplina", () => {
  const notices = [
    { subjectId: 1, reviewStatus: "pending" as const },
    { subjectId: 2, reviewStatus: "approved" as const },
    { subjectId: null, reviewStatus: "dismissed" as const },
  ];

  it("filtra avisos pela disciplina selecionada sem omitir itens quando o filtro é geral", () => {
    expect(filterInboxNotices(notices, "all")).toHaveLength(3);
    expect(filterInboxNotices(notices, 1)).toEqual([{ subjectId: 1, reviewStatus: "pending" }]);
  });

  it("sinaliza quando ainda existe um aviso para revisão", () => {
    expect(hasPendingInboxReview(notices)).toBe(true);
    expect(hasPendingInboxReview([{ subjectId: 2, reviewStatus: "approved" }])).toBe(false);
  });
});
