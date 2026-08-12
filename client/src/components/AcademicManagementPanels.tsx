import { trpc } from "@/lib/trpc";
import { BookOpen, CalendarDays, FileText, Link2, Plus, Upload } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type AcademicProfile = {
  displayName: string | null;
  institution: string | null;
  course: string | null;
  timezone: string;
} | null | undefined;

type Semester = {
  id: number;
  name: string;
  startsAt: number | null;
  endsAt: number | null;
  isCurrent: boolean;
};

type Subject = { id: number; name: string };

type StudyMaterial = {
  id: number;
  subjectId: number;
  title: string;
  type: "link" | "file";
  externalUrl: string | null;
  storageUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

type LessonTopic = {
  id: number;
  subjectId: number;
  title: string;
  details: string | null;
  plannedFor: number | null;
  source: "manual" | "gmail";
  reviewStatus: "pending" | "approved" | "dismissed";
};

const fieldClass = "mt-1.5 w-full rounded-lg border border-[#2a465f] bg-[#081a2a] px-3 py-2.5 text-sm text-[#e9eef5] outline-none transition focus:border-[#cba367] focus:ring-2 focus:ring-[#cba367]/15 placeholder:text-[#62758a]";

function formatDate(timestamp: number | null) {
  return timestamp ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(timestamp)) : "Datas não informadas";
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    const end = Math.min(offset + 0x8000, bytes.length);
    for (let index = offset; index < end; index += 1) binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export function AcademicProfilePanel({ profile, semesters }: { profile: AcademicProfile; semesters: Semester[] }) {
  const utils = trpc.useUtils();
  const saveProfile = trpc.academic.profile.save.useMutation();
  const createSemester = trpc.academic.semesters.create.useMutation();

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await saveProfile.mutateAsync({
        displayName: String(form.get("displayName") || "") || undefined,
        institution: String(form.get("institution") || "") || undefined,
        course: String(form.get("course") || "") || undefined,
        timezone: String(form.get("timezone") || "America/Sao_Paulo"),
      });
      await utils.academic.dashboard.invalidate();
      toast.success("Perfil acadêmico atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o perfil.");
    }
  };

  const submitSemester = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt") || "");
    const endsAt = String(form.get("endsAt") || "");
    try {
      await createSemester.mutateAsync({
        name: String(form.get("name") || ""),
        startsAt: startsAt ? new Date(`${startsAt}T12:00:00`).getTime() : undefined,
        endsAt: endsAt ? new Date(`${endsAt}T12:00:00`).getTime() : undefined,
        isCurrent: form.get("isCurrent") === "on",
      });
      event.currentTarget.reset();
      await utils.academic.dashboard.invalidate();
      toast.success("Período acadêmico adicionado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o período.");
    }
  };

  return (
    <section className="codex-card mb-5 p-4 sm:p-6">
      <div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 text-[#d2b071]" /><div><p className="section-label">Seu percurso</p><h2 className="mt-2 font-serif text-2xl text-[#edf1f6]">Perfil e períodos acadêmicos</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9eafc0]">Essas informações pertencem somente à sua conta e organizam disciplinas, agenda e materiais.</p></div></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form key={`${profile?.displayName ?? "empty"}-${profile?.institution ?? "empty"}-${profile?.course ?? "empty"}`} onSubmit={submitProfile} className="rounded-xl border border-[#203b54] bg-[#081827]/60 p-4">
          <p className="text-sm font-medium text-[#e4ebf2]">Dados acadêmicos</p>
          <label className="mt-4 block text-xs text-[#b7c4d1]">Nome exibido no Codex<input name="displayName" defaultValue={profile?.displayName ?? ""} placeholder="Ex.: Gabrielle Luiza" className={fieldClass} /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#b7c4d1]">Instituição<input name="institution" defaultValue={profile?.institution ?? ""} placeholder="Ex.: UFRJ" className={fieldClass} /></label><label className="text-xs text-[#b7c4d1]">Curso<input name="course" defaultValue={profile?.course ?? ""} placeholder="Ex.: Direito" className={fieldClass} /></label></div>
          <label className="mt-3 block text-xs text-[#b7c4d1]">Fuso horário<select name="timezone" defaultValue={profile?.timezone ?? "America/Sao_Paulo"} className={fieldClass}><option value="America/Sao_Paulo">Brasília (UTC−3)</option><option value="America/Manaus">Manaus (UTC−4)</option><option value="America/Rio_Branco">Rio Branco (UTC−5)</option></select></label>
          <button disabled={saveProfile.isPending} className="mt-4 rounded-lg border border-[#c7a061]/50 px-3 py-2 text-xs font-medium text-[#e6cf9d] transition hover:bg-[#c7a061] hover:text-[#071827] disabled:opacity-50">{saveProfile.isPending ? "Salvando…" : "Salvar perfil"}</button>
        </form>
        <div className="rounded-xl border border-[#203b54] bg-[#081827]/60 p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-medium text-[#e4ebf2]">Períodos cadastrados</p><span className="text-xs text-[#91a4b7]">{semesters.length} no total</span></div>
          <div className="mt-3 space-y-2">{semesters.length ? semesters.map(semester => <div key={semester.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1e3951] bg-[#0a1d2f] px-3 py-2.5"><div><p className="text-sm text-[#e1e8ef]">{semester.name}</p><p className="mt-0.5 text-[11px] text-[#8297aa]">{formatDate(semester.startsAt)} · {formatDate(semester.endsAt)}</p></div>{semester.isCurrent && <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-100">Atual</span>}</div>) : <p className="rounded-lg border border-dashed border-[#29465e] px-3 py-4 text-center text-xs text-[#92a6b8]">Nenhum período cadastrado.</p>}</div>
          <form onSubmit={submitSemester} className="mt-4 border-t border-[#1e3951] pt-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#b7c4d1]">Nome<input required name="name" placeholder="Ex.: 2026.2" className={fieldClass} /></label><label className="flex items-end gap-2 pb-2 text-xs text-[#c7d4df]"><input name="isCurrent" type="checkbox" className="h-4 w-4 accent-[#c5a061]" />Definir como atual</label><label className="text-xs text-[#b7c4d1]">Início<input name="startsAt" type="date" className={fieldClass} /></label><label className="text-xs text-[#b7c4d1]">Término<input name="endsAt" type="date" className={fieldClass} /></label></div><button disabled={createSemester.isPending} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#31506b] px-3 py-2 text-xs text-[#d2dde6] hover:border-[#caa367]/70 hover:text-[#f1d594] disabled:opacity-50"><Plus className="h-3.5 w-3.5" />{createSemester.isPending ? "Criando…" : "Adicionar período"}</button></form>
        </div>
      </div>
    </section>
  );
}

export function MaterialsPanel({ subjects, materials }: { subjects: Subject[]; materials: StudyMaterial[] }) {
  const utils = trpc.useUtils();
  const createLink = trpc.academic.materials.createLink.useMutation();
  const upload = trpc.academic.materials.upload.useMutation();
  const [materialType, setMaterialType] = useState<"link" | "file">("link");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(() => subjects[0]?.id ?? null);
  const [file, setFile] = useState<File | null>(null);
  const groupedMaterials = useMemo(() => subjects.map(subject => ({ subject, entries: materials.filter(material => material.subjectId === subject.id) })), [subjects, materials]);

  const submitMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSubjectId) return toast.error("Cadastre ou selecione uma disciplina antes de adicionar materiais.");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "");
    try {
      if (materialType === "link") {
        await createLink.mutateAsync({ subjectId: selectedSubjectId, title, url: String(form.get("url") || "") });
      } else {
        if (!file) return toast.error("Escolha um arquivo para enviar.");
        if (file.size > 5_000_000) return toast.error("O arquivo deve ter no máximo 5 MB.");
        await upload.mutateAsync({ subjectId: selectedSubjectId, title, filename: file.name, contentType: file.type || "application/octet-stream", contentBase64: await fileToBase64(file) });
      }
      event.currentTarget.reset();
      setFile(null);
      await utils.academic.dashboard.invalidate();
      toast.success(materialType === "link" ? "Link adicionado à disciplina." : "Arquivo armazenado com segurança.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o material.");
    }
  };

  const isSaving = createLink.isPending || upload.isPending;
  return (
    <section className="codex-card mb-5 p-4 sm:p-6">
      <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-[#d2b071]" /><div><p className="section-label">Biblioteca da disciplina</p><h2 className="mt-2 font-serif text-2xl text-[#edf1f6]">Materiais de estudo</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9eafc0]">Guarde links ou envie arquivos de até 5 MB. Os arquivos ficam fora do banco de dados e vinculados à sua conta.</p></div></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submitMaterial} className="h-fit rounded-xl border border-[#203b54] bg-[#081827]/60 p-4">
          <div className="flex gap-2"><button type="button" onClick={() => setMaterialType("link")} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${materialType === "link" ? "border-[#c7a061]/60 bg-[#c7a061]/10 text-[#ead39e]" : "border-[#29465f] text-[#aebdca]"}`}><Link2 className="h-3.5 w-3.5" />Link</button><button type="button" onClick={() => setMaterialType("file")} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${materialType === "file" ? "border-[#c7a061]/60 bg-[#c7a061]/10 text-[#ead39e]" : "border-[#29465f] text-[#aebdca]"}`}><Upload className="h-3.5 w-3.5" />Arquivo</button></div>
          <label className="mt-4 block text-xs text-[#b7c4d1]">Disciplina<select value={selectedSubjectId ?? ""} onChange={event => setSelectedSubjectId(event.target.value ? Number(event.target.value) : null)} className={fieldClass} disabled={!subjects.length}><option value="">Selecione uma disciplina</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="mt-3 block text-xs text-[#b7c4d1]">Título<input required name="title" placeholder={materialType === "link" ? "Ex.: Código Civil atualizado" : "Ex.: Aula 04 — Sucessões"} className={fieldClass} /></label>
          {materialType === "link" ? <label className="mt-3 block text-xs text-[#b7c4d1]">URL<input required name="url" type="url" placeholder="https://…" className={fieldClass} /></label> : <label className="mt-3 block text-xs text-[#b7c4d1]">Arquivo<input required type="file" onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full rounded-lg border border-[#2a465f] bg-[#081a2a] px-3 py-2 text-xs text-[#b9c7d3] file:mr-3 file:rounded-md file:border-0 file:bg-[#183652] file:px-2.5 file:py-1.5 file:text-xs file:text-[#e6d09b]" /></label>}
          <button disabled={isSaving || !subjects.length} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#c7a061] px-3 py-2 text-xs font-semibold text-[#071827] transition hover:bg-[#e2c17f] disabled:opacity-50"><Plus className="h-3.5 w-3.5" />{isSaving ? "Salvando…" : "Adicionar material"}</button>
        </form>
        <div className="space-y-3">{groupedMaterials.length ? groupedMaterials.map(({ subject, entries }) => <article key={subject.id} className="rounded-xl border border-[#203b54] bg-[#081827]/45 p-4"><div className="flex items-center justify-between gap-3"><p className="font-serif text-lg text-[#e6edf3]">{subject.name}</p><span className="text-xs text-[#8ea1b3]">{entries.length} material{entries.length === 1 ? "" : "is"}</span></div><div className="mt-3 space-y-2">{entries.length ? entries.map(material => <a key={material.id} href={material.type === "link" ? material.externalUrl || undefined : material.storageUrl || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-[#1d3952] bg-[#0a1d2f] px-3 py-2.5 transition hover:border-[#b99964]/50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#142e46] text-[#dbbe82]">{material.type === "link" ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-[#e3eaf1]">{material.title}</span><span className="mt-0.5 block text-[11px] text-[#8ca0b3]">{material.type === "link" ? "Link externo" : `${material.mimeType || "Arquivo"}${material.sizeBytes ? ` · ${Math.ceil(material.sizeBytes / 1024)} KB` : ""}`}</span></span></a>) : <p className="rounded-lg border border-dashed border-[#29465e] px-3 py-3 text-xs text-[#8297aa]">Nenhum material salvo nesta disciplina.</p>}</div></article>) : <div className="rounded-xl border border-dashed border-[#29465e] p-6 text-center text-sm text-[#9aabbb]">Cadastre uma disciplina para começar a organizar materiais.</div>}</div>
      </div>
    </section>
  );
}

/** Permite registrar o plano de aula quando o professor não o envia por e-mail. */
export function LessonTopicsPanel({ subjects, topics }: { subjects: Subject[]; topics: LessonTopic[] }) {
  const utils = trpc.useUtils();
  const createTopic = trpc.academic.lessonTopics.create.useMutation();
  const reviewTopic = trpc.academic.lessonTopics.review.useMutation();
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const submitTopic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subjectId) return toast.error("Selecione a disciplina da aula.");
    const form = new FormData(event.currentTarget);
    const date = String(form.get("plannedFor") || "");
    try {
      await createTopic.mutateAsync({
        subjectId,
        title: String(form.get("title") || ""),
        details: String(form.get("details") || "") || undefined,
        plannedFor: new Date(`${date}T12:00:00`).getTime(),
      });
      event.currentTarget.reset();
      await utils.academic.dashboard.invalidate();
      toast.success("Conteúdo previsto salvo para a aula.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o conteúdo.");
    }
  };

  const review = async (id: number, reviewStatus: "approved" | "dismissed") => {
    try {
      await reviewTopic.mutateAsync({ id, reviewStatus });
      await utils.academic.dashboard.invalidate();
      toast.success(reviewStatus === "approved" ? "Tema aprovado para a próxima aula." : "Tema descartado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível revisar o tema.");
    }
  };

  return (
    <section className="codex-card mb-5 p-4 sm:p-6">
      <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-[#d2b071]" /><div><p className="section-label">Planejamento de aula</p><h2 className="mt-2 font-serif text-2xl text-[#edf1f6]">Assunto previsto para cada encontro</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9eafc0]">Cadastre o conteúdo manualmente quando ele não chegar por e-mail. Os conteúdos recebidos automaticamente sempre aparecem para sua revisão antes de serem exibidos.</p></div></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submitTopic} className="h-fit rounded-xl border border-[#203b54] bg-[#081827]/60 p-4">
          <label className="block text-xs text-[#b7c4d1]">Disciplina<select required value={subjectId ?? ""} onChange={event => setSubjectId(event.target.value ? Number(event.target.value) : null)} className={fieldClass}><option value="">Selecione uma disciplina</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="mt-3 block text-xs text-[#b7c4d1]">Data da aula<input required name="plannedFor" type="date" className={fieldClass} /></label>
          <label className="mt-3 block text-xs text-[#b7c4d1]">Assunto previsto<input required name="title" placeholder="Ex.: Inventário e partilha" className={fieldClass} /></label>
          <label className="mt-3 block text-xs text-[#b7c4d1]">Observações<textarea name="details" rows={3} placeholder="Leitura, capítulo, atividade ou orientação da professora." className={fieldClass} /></label>
          <button disabled={createTopic.isPending || !subjects.length} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#c7a061] px-3 py-2 text-xs font-semibold text-[#071827] transition hover:bg-[#e2c17f] disabled:opacity-50"><Plus className="h-3.5 w-3.5" />{createTopic.isPending ? "Salvando…" : "Salvar conteúdo"}</button>
        </form>
        <div className="space-y-2">{topics.length ? topics.filter(topic => topic.reviewStatus !== "dismissed").map(topic => <article key={topic.id} className="rounded-xl border border-[#203b54] bg-[#081827]/45 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-[#e4ebf2]">{topic.title}</p><p className="mt-1 text-xs text-[#93a5b7]">{subjects.find(subject => subject.id === topic.subjectId)?.name || "Disciplina"} · {topic.plannedFor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(topic.plannedFor)) : "Próxima aula a confirmar"}</p>{topic.details && <p className="mt-2 text-xs leading-relaxed text-[#aab8c5]">{topic.details}</p>}{topic.reviewStatus === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => review(topic.id, "approved")} disabled={reviewTopic.isPending} className="rounded-md border border-emerald-300/40 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-300/10 disabled:opacity-50">Aprovar assunto</button><button onClick={() => review(topic.id, "dismissed")} disabled={reviewTopic.isPending} className="rounded-md border border-[#526a80] px-2 py-1 text-[11px] text-[#b7c4d0] hover:bg-[#1a334a] disabled:opacity-50">Descartar</button></div>}</div><span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${topic.reviewStatus === "pending" ? "border-[#d2b071]/40 text-[#e6cb91]" : "border-emerald-300/30 text-emerald-100"}`}>{topic.reviewStatus === "pending" ? "Revisar e-mail" : topic.source === "gmail" ? "E-mail aprovado" : "Manual"}</span></div></article>) : <div className="rounded-xl border border-dashed border-[#29465e] px-4 py-8 text-center text-sm text-[#9aabbb]">Nenhum conteúdo previsto cadastrado ainda.</div>}</div>
      </div>
    </section>
  );
}
