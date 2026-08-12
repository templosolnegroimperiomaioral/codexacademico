import { describe, expect, it } from "vitest";
import { informedGrade, nextClassOccurrences } from "./informedGrade";

describe("grade acadêmica informada", () => {
  it("mantém dez disciplinas e gera uma ocorrência semanal por período", () => {
    expect(informedGrade).toHaveLength(10);
    expect(nextClassOccurrences(informedGrade[0].classes[0])).toHaveLength(18);
  });

  it("preserva todos os horários e salas como dados do curso", () => {
    const commercial = informedGrade.find(subject => subject.code === "IUE473");
    expect(commercial?.classes).toHaveLength(3);
    expect(commercial?.classes[0].room).toContain("0405");
  });
});
