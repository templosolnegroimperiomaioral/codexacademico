import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type ComposerType = "subject" | "task" | "event";

type AcademicComposerProps = {
  type: ComposerType | null;
  subjects: { id: number; name: string }[];
  semesters: { id: number; name: string; isCurrent: boolean }[];
  onClose: () => void;
};

const metadata: Record<ComposerType, { title: string; description: string; submit: string }> = {
  subject: { title: "Nova disciplina", description: "Organize matérias, professor e sala para este período.", submit: "Adicionar disciplina" },
  task: { title: "Nova tarefa", description: "Registre uma atividade para manter seu plano de estudo em dia.", submit: "Salvar tarefa" },
  event: { title: "Novo compromisso", description: "Adicione prova, trabalho, apresentação ou outro compromisso à agenda.", submit: "Salvar compromisso" },
};

function fieldClassName() {
  return "mt-1.5 w-full rounded-lg border border-[#2a465f] bg-[#081a2a] px-3 py-2.5 text-sm text-[#e9eef5] outline-none transition focus:border-[#cba367] focus:ring-2 focus:ring-[#cba367]/15 placeholder:text-[#62758a]";
}

export function AcademicComposer({ type, subjects, semesters, onClose }: AcademicComposerProps) {
  const utils = trpc.useUtils();
  const [isSaving, setIsSaving] = useState(false);
  const createSubject = trpc.academic.subjects.create.useMutation();
  const createTask = trpc.academic.tasks.create.useMutation();
  const createEvent = trpc.academic.events.create.useMutation();

  if (!type) return null;
  const content = metadata[type];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subjectId = String(form.get("subjectId") || "none");
    const shared = subjectId !== "none" ? { subjectId: Number(subjectId) } : {};
    setIsSaving(true);
    try {
      if (type === "subject") {
        const semesterId = String(form.get("semesterId") || "none");
        await createSubject.mutateAsync({
          name: String(form.get("name") || ""),
          professor: String(form.get("professor") || "") || undefined,
          room: String(form.get("room") || "") || undefined,
          color: String(form.get("color") || "#C9A66B"),
          scheduleNote: String(form.get("scheduleNote") || "") || undefined,
          ...(semesterId !== "none" ? { semesterId: Number(semesterId) } : {}),
        });
      }
      if (type === "task") {
        const due = String(form.get("dueAt") || "");
        await createTask.mutateAsync({
          title: String(form.get("title") || ""),
          notes: String(form.get("notes") || "") || undefined,
          dueAt: due ? new Date(due).getTime() : undefined,
          ...shared,
        });
      }
      if (type === "event") {
        const startsAt = String(form.get("startsAt") || "");
        const endsAt = String(form.get("endsAt") || "");
        await createEvent.mutateAsync({
          title: String(form.get("title") || ""),
          type: String(form.get("eventType") || "other") as "class" | "exam" | "assignment" | "presentation" | "seminar" | "reading" | "hearing" | "appointment" | "other",
          location: String(form.get("location") || "") || undefined,
          details: String(form.get("details") || "") || undefined,
          startsAt: new Date(startsAt).getTime(),
          endsAt: endsAt ? new Date(endsAt).getTime() : undefined,
          ...shared,
        });
      }
      await utils.academic.dashboard.invalidate();
      toast.success(`${type === "subject" ? "Disciplina" : type === "task" ? "Tarefa" : "Compromisso"} salvo com sucesso.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-[#020a12]/80 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" onMouseDown={onClose}>
      <section className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-[#304e67] bg-[#091b2b] p-5 shadow-2xl sm:max-w-[540px] sm:rounded-2xl sm:p-6" onMouseDown={event => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="composer-title">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-[#d4b36f]">Codex Acadêmico</p><h2 id="composer-title" className="mt-1 font-serif text-2xl text-[#f0f2f5]">{content.title}</h2><p className="mt-1.5 text-sm leading-relaxed text-[#9dafc1]">{content.description}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#a9b7c5] hover:bg-[#173048] hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "subject" && <>
            <label className="block text-sm text-[#c4d0dc]">Nome da disciplina<input name="name" required placeholder="Ex.: Direito Civil III" className={fieldClassName()} /></label>
            <label className="block text-sm text-[#c4d0dc]">Período acadêmico<select name="semesterId" defaultValue={semesters.find(semester => semester.isCurrent)?.id?.toString() ?? "none"} className={fieldClassName()}><option value="none">Sem período associado</option>{semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.name}{semester.isCurrent ? " · Atual" : ""}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#c4d0dc]">Professor(a)<input name="professor" placeholder="Ex.: Prof. Gustavo" className={fieldClassName()} /></label><label className="block text-sm text-[#c4d0dc]">Sala<input name="room" placeholder="Ex.: Sala 203" className={fieldClassName()} /></label></div>
            <label className="block text-sm text-[#c4d0dc]">Cor de identificação<input name="color" type="color" defaultValue="#C9A66B" className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-[#2a465f] bg-[#081a2a] p-1" /></label>
            <label className="block text-sm text-[#c4d0dc]">Observação de horário<textarea name="scheduleNote" rows={3} placeholder="Ex.: terças e quintas, 10h às 11h40" className={fieldClassName()} /></label>
          </>}
          {type !== "subject" && <>
            <label className="block text-sm text-[#c4d0dc]">{type === "task" ? "Tarefa" : "Título"}<input name="title" required placeholder={type === "task" ? "Ex.: Ler ADI 4277" : "Ex.: Prova P1"} className={fieldClassName()} /></label>
            <label className="block text-sm text-[#c4d0dc]">Disciplina<select name="subjectId" defaultValue="none" className={fieldClassName()}><option value="none">Sem disciplina vinculada</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          </>}
          {type === "task" && <><label className="block text-sm text-[#c4d0dc]">Prazo<input name="dueAt" type="datetime-local" className={fieldClassName()} /></label><label className="block text-sm text-[#c4d0dc]">Notas<textarea name="notes" rows={3} placeholder="Adicione detalhes ou um lembrete." className={fieldClassName()} /></label></>}
          {type === "event" && <><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#c4d0dc]">Tipo<select name="eventType" defaultValue="exam" className={fieldClassName()}><option value="exam">Prova</option><option value="assignment">Trabalho</option><option value="presentation">Apresentação</option><option value="seminar">Seminário</option><option value="reading">Leitura</option><option value="hearing">Audiência</option><option value="class">Aula</option><option value="appointment">Compromisso</option><option value="other">Outro</option></select></label><label className="block text-sm text-[#c4d0dc]">Local<input name="location" placeholder="Ex.: Sala 202" className={fieldClassName()} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#c4d0dc]">Início<input name="startsAt" required type="datetime-local" className={fieldClassName()} /></label><label className="block text-sm text-[#c4d0dc]">Término<input name="endsAt" type="datetime-local" className={fieldClassName()} /></label></div><label className="block text-sm text-[#c4d0dc]">Detalhes<textarea name="details" rows={3} placeholder="Instruções, material ou contexto." className={fieldClassName()} /></label></>}
          <footer className="flex flex-col-reverse gap-2 border-t border-[#1d374f] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-[#b1c0ce] hover:bg-[#112a42]">Cancelar</button><button disabled={isSaving} className="rounded-lg bg-[#c7a061] px-4 py-2.5 text-sm font-semibold text-[#071827] transition hover:bg-[#e2c17f] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Salvando..." : content.submit}</button></footer>
        </form>
      </section>
    </div>
  );
}
