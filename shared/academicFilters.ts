export type SubjectLinkedItem = { subjectId: number | null | undefined };

/** Mantém itens sem disciplina visíveis apenas na visão geral, evitando associações implícitas. */
export function filterBySubject<T extends SubjectLinkedItem>(items: T[], subjectId: number | "all") {
  return subjectId === "all" ? items : items.filter(item => item.subjectId === subjectId);
}
