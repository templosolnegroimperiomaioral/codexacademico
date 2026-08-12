export type InformedClass = { weekday: number; startsAt: string; endsAt: string; room: string };
export type InformedSubject = { code: string; name: string; professor: string; classes: InformedClass[]; color: string };

/** Grade conferida a partir das imagens enviadas pela usuária em 11/08/2026. */
export const informedGrade: InformedSubject[] = [
  { code: "IUP365", name: "Responsabilidade Civil", professor: "Lorenzo Martins Pompilio da Hora", color: "#809dc2", classes: [{ weekday: 2, startsAt: "18:30", endsAt: "20:10", room: "Sala 0410 · Faculdade de Direito" }] },
  { code: "IUE473", name: "Direito Comercial III", professor: "Kone Prieto Furtunato", color: "#b89ce8", classes: [{ weekday: 1, startsAt: "11:10", endsAt: "12:50", room: "Sala 0405 · Faculdade de Direito" }, { weekday: 4, startsAt: "11:10", endsAt: "12:50", room: "Sala 0405 · Faculdade de Direito" }, { weekday: 6, startsAt: "11:10", endsAt: "12:50", room: "Sala 0405 · Faculdade de Direito" }] },
  { code: "IUF022", name: "Direito e Relações Raciais", professor: "Philippe Oliveira de Almeida", color: "#9fe3b5", classes: [{ weekday: 4, startsAt: "16:40", endsAt: "18:20", room: "Sala 0302 · Faculdade de Direito" }] },
  { code: "IUS365", name: "Direito Processual Civil III", professor: "Camila Pavi Garcia Rosa", color: "#d9bd82", classes: [{ weekday: 2, startsAt: "20:10", endsAt: "21:50", room: "Sala 0301 · Faculdade de Direito" }, { weekday: 5, startsAt: "18:30", endsAt: "20:10", room: "Sala 0301 · Faculdade de Direito" }] },
  { code: "IUS502", name: "Direito Processual Constitucional", professor: "Marcella Simoes Pennello Meirelles", color: "#aeb3ef", classes: [{ weekday: 3, startsAt: "19:20", endsAt: "21:00", room: "Sala 0406 · Faculdade de Direito" }] },
  { code: "IUP529", name: "Direito do Consumidor", professor: "Luciana de Abreu Miranda", color: "#8eb8e5", classes: [{ weekday: 1, startsAt: "18:30", endsAt: "20:10", room: "Sala 0408 · Faculdade de Direito" }] },
  { code: "IUS500", name: "Ética Profissional e Estatuto da Advocacia", professor: "Thais Freire de Vasconcellos", color: "#b6a7ef", classes: [{ weekday: 4, startsAt: "18:30", endsAt: "20:10", room: "Sala 0408 · Faculdade de Direito" }] },
  { code: "IUP527", name: "Direito Civil VIII — Sucessões", professor: "Luciana de Abreu Miranda", color: "#e5c78d", classes: [{ weekday: 3, startsAt: "17:40", endsAt: "19:20", room: "Sala 0409 · Faculdade de Direito" }] },
  { code: "IUS501", name: "Cidadania e Movimentos Sociais", professor: "Marcella Simoes Pennello Meirelles", color: "#8eb8e5", classes: [{ weekday: 3, startsAt: "21:00", endsAt: "22:40", room: "Sala 0406 · Faculdade de Direito" }] },
  { code: "IUE500", name: "Direito da Seguridade Social", professor: "Fabio de Souza Silva", color: "#b5a5e7", classes: [{ weekday: 4, startsAt: "09:20", endsAt: "11:00", room: "Sala 0407 · Faculdade de Direito" }] },
];

export function nextClassOccurrences(entry: InformedClass, weeks = 18) {
  const firstMonday = new Date(Date.UTC(2026, 7, 10, 3));
  const [startHour, startMinute] = entry.startsAt.split(":").map(Number);
  const [endHour, endMinute] = entry.endsAt.split(":").map(Number);
  return Array.from({ length: weeks }, (_, week) => {
    const startsAt = new Date(firstMonday);
    startsAt.setUTCDate(firstMonday.getUTCDate() + (entry.weekday - 1) + week * 7);
    startsAt.setUTCHours(startHour + 3, startMinute, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(endHour + 3, endMinute, 0, 0);
    return { startsAt: startsAt.getTime(), endsAt: endsAt.getTime() };
  });
}
