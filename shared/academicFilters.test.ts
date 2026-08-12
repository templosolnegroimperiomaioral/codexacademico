import { filterBySubject } from "./academicFilters";

describe("filtro acadêmico por disciplina", () => {
  const items = [
    { title: "Prova", subjectId: 4 },
    { title: "Trabalho", subjectId: 7 },
    { title: "Lembrete pessoal", subjectId: null },
  ];

  it("mantém todos os itens na visão geral", () => {
    expect(filterBySubject(items, "all")).toHaveLength(3);
  });

  it("mantém somente itens vinculados à disciplina escolhida", () => {
    expect(filterBySubject(items, 7)).toEqual([{ title: "Trabalho", subjectId: 7 }]);
    expect(filterBySubject(items, 99)).toEqual([]);
  });
});
