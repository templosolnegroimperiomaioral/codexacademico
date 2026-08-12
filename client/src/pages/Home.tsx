import { useAuth } from "@/_core/hooks/useAuth";
import { AcademicComposer } from "@/components/AcademicComposer";
import { AcademicProfilePanel, LessonTopicsPanel, MaterialsPanel } from "@/components/AcademicManagementPanels";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Section = "Hoje" | "Disciplinas" | "Agenda" | "Caixa Acadêmica" | "Materiais" | "Configurações";
type ComposerType = "subject" | "task" | "event";

const navigation: { label: Section; icon: typeof LayoutDashboard; caption: string }[] = [
  { label: "Hoje", icon: LayoutDashboard, caption: "O que importa agora" },
  { label: "Disciplinas", icon: BookOpen, caption: "Seu percurso de estudo" },
  { label: "Agenda", icon: CalendarDays, caption: "Eventos acadêmicos" },
  { label: "Caixa Acadêmica", icon: Inbox, caption: "Novidades de todas as fontes" },
  { label: "Materiais", icon: FileText, caption: "Biblioteca por disciplina" },
  { label: "Configurações", icon: Settings, caption: "Conta e integrações" },
];

const brandLogoUrl = "/brand/codex-brand-no-tagline.png";
const brandIconUrl = "/icons/codex-512.png";
const sourceLabels: Record<string, string> = {
  gmail: "Gmail",
  classroom: "Classroom",
  calendar: "Google Agenda",
  manual: "Manual",
  system: "Codex",
};
const eventLabels: Record<string, string> = {
  class: "Aula",
  exam: "Prova",
  assignment: "Trabalho",
  presentation: "Apresentação",
  seminar: "Seminário",
  reading: "Leitura",
  hearing: "Audiência",
  appointment: "Compromisso",
  other: "Outro",
};

const demoSubjects = [
  { id: -1, name: "Direito Constitucional II", professor: "Prof. Adriano Sant'Ana", room: "Sala 202", scheduleNote: "Terças e quintas · 08h", color: "#C9A66B" },
  { id: -2, name: "Direito Civil III", professor: "Prof. Gustavo Tepedino", room: "Sala 203", scheduleNote: "Terças e quintas · 10h", color: "#809DC2" },
  { id: -3, name: "Processo Civil", professor: "Prof. Daniel Mitidiero", room: "Sala 204", scheduleNote: "Quartas · 14h", color: "#D9BD82" },
];
const demoEvents = [
  { id: -1, subjectId: -1, title: "Direito Constitucional II", type: "class", startsAt: Date.now() + 7_200_000, endsAt: Date.now() + 13_200_000, location: "Sala 202", source: "manual" },
  { id: -2, subjectId: -1, title: "Prova P1", type: "exam", startsAt: Date.now() + 604_800_000, location: "Sala 202", source: "calendar" },
  { id: -3, subjectId: -3, title: "Trabalho — contestação", type: "assignment", startsAt: Date.now() + 864_000_000, location: null, source: "classroom" },
  { id: -4, subjectId: -2, title: "Leitura: obrigações", type: "reading", startsAt: Date.now() + 172_800_000, location: null, source: "gmail" },
];
const demoTasks = [
  { id: -1, subjectId: -1, title: "Ler ADI 4277", dueAt: Date.now() + 21_600_000, isCompleted: false, source: "manual" },
  { id: -2, subjectId: -2, title: "Finalizar fichamento", dueAt: Date.now() + 86_400_000, isCompleted: false, source: "manual" },
  { id: -3, subjectId: -3, title: "Revisar roteiro de contestação", dueAt: Date.now() + 172_800_000, isCompleted: true, source: "classroom" },
];
const demoNotices = [
  { id: -1, source: "classroom", title: "Professor publicou material", summary: "Novo arquivo relacionado à próxima aula de Constitucional II.", receivedAt: Date.now() - 3_600_000, reviewStatus: "pending", subjectName: "Direito Constitucional II", subjectId: -1, actionUrl: undefined, detectedStartsAt: undefined, detectedDueAt: undefined },
  { id: -2, source: "gmail", title: "Mudança de sala", summary: "A próxima aula de Direito Civil III será realizada na Sala 203.", receivedAt: Date.now() - 7_200_000, reviewStatus: "approved", subjectName: "Direito Civil III", subjectId: -2, actionUrl: undefined, detectedStartsAt: undefined, detectedDueAt: undefined },
  { id: -3, source: "calendar", title: "Audiência cadastrada", summary: "Compromisso adicionado à agenda para acompanhamento acadêmico.", receivedAt: Date.now() - 86_400_000, reviewStatus: "approved", subjectName: "Processo Civil", subjectId: -3, actionUrl: undefined, detectedStartsAt: undefined, detectedDueAt: Date.now() + 1_209_600_000 },
];

function NavItem({ item, active, onClick, compact = false }: { item: typeof navigation[number]; active: boolean; onClick: () => void; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={`group flex items-center gap-3 rounded-xl transition-all duration-200 ${compact ? "flex-col justify-center gap-1 px-1 py-2 text-[9px]" : "w-full px-3 py-2.5 text-sm"} ${active ? "bg-[#17314e] text-[#e8d29d] shadow-[inset_0_0_0_1px_rgba(201,166,107,0.13)]" : "text-[#9aaabd] hover:bg-[#10243a] hover:text-[#e6edf7]"}`} aria-current={active ? "page" : undefined}>
      <Icon className={`${compact ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0`} strokeWidth={1.6} />
      <span className={compact ? "leading-none" : "font-medium"}>{item.label}</span>
    </button>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color = source === "classroom" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : source === "gmail" ? "border-[#d3a866]/30 bg-[#d3a866]/10 text-[#e9ce9b]" : source === "calendar" ? "border-sky-300/30 bg-sky-300/10 text-sky-100" : "border-[#536c83] bg-[#10273b] text-[#b7c7d5]";
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[10px] ${color}`}>{sourceLabels[source] || source}</span>;
}

function SectionHeading({ overline, title, description, action }: { overline: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="section-label">{overline}</p><h2 className="mt-2 font-serif text-3xl text-[#edf1f6]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#98aabd]">{description}</p></div>{action}</div>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [section, setSection] = useState<Section>("Hoje");
  const [menuOpen, setMenuOpen] = useState(false);
  const [composer, setComposer] = useState<ComposerType | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.academic.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const integrationsQuery = trpc.academic.integrations.summary.useQuery(undefined, { enabled: isAuthenticated });
  const notificationsQuery = trpc.academic.integrations.notifications.useQuery(undefined, { enabled: isAuthenticated });
  const autoSyncQuery = trpc.academic.integrations.autoSyncStatus.useQuery(undefined, { enabled: isAuthenticated });
  const updateTask = trpc.academic.tasks.setCompleted.useMutation({ onSuccess: () => void utils.academic.dashboard.invalidate() });
  const reviewNotice = trpc.academic.integrations.reviewNotification.useMutation({
    onSuccess: () => { void utils.academic.integrations.notifications.invalidate(); void utils.academic.dashboard.invalidate(); toast.success("Sugestão revisada."); },
    onError: error => toast.error(error.message),
  });
  const authorizeGoogle = trpc.academic.integrations.googleAuthorization.useMutation({ onSuccess: url => window.location.assign(url), onError: error => toast.error(error.message) });
  const syncGoogle = trpc.academic.integrations.syncGoogle.useMutation({
    onSuccess: () => { void utils.academic.integrations.notifications.invalidate(); void utils.academic.integrations.summary.invalidate(); void utils.academic.dashboard.invalidate(); toast.success("Caixa Acadêmica atualizada."); },
    onError: error => toast.error(error.message),
  });
  const enableAutoSync = trpc.academic.integrations.enableAutoSync.useMutation({ onSuccess: () => { void utils.academic.integrations.autoSyncStatus.invalidate(); toast.success("Atualizações automáticas ativadas."); }, onError: error => toast.error(error.message) });
  const disableAutoSync = trpc.academic.integrations.disableAutoSync.useMutation({ onSuccess: () => { void utils.academic.integrations.autoSyncStatus.invalidate(); toast.success("Atualizações automáticas pausadas."); }, onError: error => toast.error(error.message) });

  const fullName = dashboardQuery.data?.profile?.displayName || user?.name || "Estudante";
  const name = useMemo(() => fullName.split(" ")[0] || "Estudante", [fullName]);
  const todayText = useMemo(() => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date()), []);
  const persistedSubjects = dashboardQuery.data?.subjects ?? [];
  const persistedEvents = dashboardQuery.data?.events ?? [];
  const persistedTasks = dashboardQuery.data?.tasks ?? [];
  const persistedMaterials = dashboardQuery.data?.materials ?? [];
  const lessonTopics = dashboardQuery.data?.lessonTopics ?? [];
  const notices = notificationsQuery.data ?? [];
  const subjects = persistedSubjects.length ? persistedSubjects : demoSubjects;
  const events = persistedEvents.length ? persistedEvents : demoEvents;
  const tasks = persistedTasks.length ? persistedTasks : demoTasks;
  const inbox = notices.length ? notices : demoNotices;
  const selectedSubject = subjects.find(subject => subject.id === (selectedSubjectId ?? subjects[0]?.id)) ?? subjects[0];
  const isDemo = !isAuthenticated || !dashboardQuery.data;
  const googleConnected = integrationsQuery.data?.some(item => item.status === "connected") ?? false;
  const autoSyncEnabled = autoSyncQuery.data?.isEnabled ?? false;
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }), []);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }), []);

  const getSubjectName = (subjectId: number | null | undefined) => subjects.find(subject => subject.id === subjectId)?.name || "Sem disciplina";
  const relativeDate = (time: number | null | undefined) => {
    if (!time) return "Sem prazo";
    const days = Math.ceil((time - Date.now()) / 86_400_000);
    if (days <= 0) return "Hoje";
    if (days === 1) return "Amanhã";
    return `${days} dias`;
  };
  const sortedEvents = [...events].sort((a, b) => a.startsAt - b.startsAt);
  const nextClass = sortedEvents.find(event => event.type === "class") || sortedEvents[0];
  const upcomingEvents = sortedEvents.filter(event => event.id !== nextClass?.id).slice(0, 3);
  const pendingTasks = tasks.filter(task => !task.isCompleted).slice(0, 3);
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const pendingNotices = inbox.filter(notice => notice.reviewStatus === "pending");
  const weekEvents = sortedEvents.filter(event => event.startsAt <= Date.now() + 7 * 86_400_000).length;
  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return [];
    return [
      ...subjects.map(item => ({ type: "Disciplina", title: item.name, detail: item.professor || "Disciplina acadêmica", onClick: () => { setSelectedSubjectId(item.id); setSection("Disciplinas"); } })),
      ...events.map(item => ({ type: "Evento", title: item.title, detail: eventLabels[item.type] || "Evento acadêmico", onClick: () => setSection("Agenda") })),
      ...tasks.map(item => ({ type: "Pendência", title: item.title, detail: getSubjectName(item.subjectId), onClick: () => setSection("Hoje") })),
      ...inbox.map(item => ({ type: "Caixa", title: item.title, detail: sourceLabels[item.source] || item.source, onClick: () => setSection("Caixa Acadêmica") })),
    ].filter(item => `${item.title} ${item.detail}`.toLocaleLowerCase("pt-BR").includes(query)).slice(0, 6);
  }, [search, subjects, events, tasks, inbox]);

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) { toast.info("Entre no Codex para salvar dados na sua conta."); startLogin(); return; }
    callback();
  };
  const goTo = (next: Section) => { setSection(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggleTask = (task: { id: number; isCompleted: boolean }) => {
    if (task.id > 0) updateTask.mutate({ id: task.id, isCompleted: !task.isCompleted });
    else toast.info("Este é um exemplo visual. Entre para registrar suas próprias pendências.");
  };
  const refreshInbox = () => requireAuth(() => googleConnected ? syncGoogle.mutate() : authorizeGoogle.mutate());

  const headerCopy: Record<Section, { title: string; description: string }> = {
    "Hoje": { title: `Bom dia, ${name}.`, description: "Em poucos segundos, veja apenas o que pede sua atenção." },
    "Disciplinas": { title: "Disciplinas", description: "Cada matéria concentra horários, conteúdos, materiais e compromissos." },
    "Agenda": { title: "Agenda", description: "Todo compromisso acadêmico em um único modelo, independentemente da origem." },
    "Caixa Acadêmica": { title: "Caixa Acadêmica", description: "Novidades do Gmail, Classroom e Agenda organizadas para sua revisão." },
    "Materiais": { title: "Materiais", description: "A biblioteca de estudo organizada por disciplina, sempre sob seu controle." },
    "Configurações": { title: "Configurações", description: "Dados acadêmicos, integrações e preferências de atualização." },
  };

  return (
    <div className="codex-app min-h-screen bg-[#061321] text-[#e7edf5]">
      <aside className="codex-sidebar fixed inset-y-0 left-0 z-40 w-[276px] flex-col border-r border-[#1b344c] bg-[#061523]/[0.98] px-4 py-5 shadow-[14px_0_45px_rgba(0,0,0,0.16)]">
        <div className="mb-6 flex justify-center border-b border-[#173149] pb-5"><img src={brandLogoUrl} alt="Codex — Direito UFRJ" className="h-[178px] w-[200px] object-contain" /></div>
        <nav className="space-y-1" aria-label="Navegação principal">{navigation.map(item => <NavItem key={item.label} item={item} active={section === item.label} onClick={() => goTo(item.label)} />)}</nav>
        <div className="mt-auto rounded-xl border border-[#1a324a] bg-[#0a1d2e] p-3"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#aa8751]/40 bg-[#142a40] text-xs font-semibold text-[#e7cf99]">{name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-medium text-[#e8edf5]">{isAuthenticated ? fullName : "Seu espaço acadêmico"}</p><p className="mt-0.5 text-[10px] text-[#90a2b6]">{dashboardQuery.data?.semesters?.find(item => item.isCurrent)?.name || "Organize o seu período"}</p></div></div></div>
      </aside>

      <div className="lg:pl-[276px]">
        <header className="sticky top-0 z-30 border-b border-[#1a3149]/90 bg-[#071827]/90 px-4 py-3 backdrop-blur lg:px-8 lg:py-4">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden"><button onClick={() => setMenuOpen(true)} className="rounded-lg border border-[#294157] bg-[#0a1d2e] p-2 text-[#d2b071]" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button><img src={brandIconUrl} alt="Codex" className="h-8 w-8 rounded-lg border border-[#c9a66b]/30 object-cover" /></div>
            <div className="hidden lg:block"><p className="font-serif text-[30px] leading-none text-[#f0f1f4]">{headerCopy[section].title}</p><p className="mt-2 capitalize text-sm text-[#9aacbd]">{todayText}</p></div>
            <p className="font-serif text-xl text-[#f0f1f4] lg:hidden">{section}</p>
            <div className="flex items-center gap-2 lg:gap-4"><div className="relative hidden md:block"><label className="flex h-10 items-center gap-2 rounded-lg border border-[#213950] bg-[#0b1c2d] px-3 text-sm text-[#8fa0b2]"><Search className="h-4 w-4" strokeWidth={1.5} /><input value={search} onChange={event => setSearch(event.target.value)} className="w-48 bg-transparent outline-none placeholder:text-[#73869a]" placeholder="Pesquisar no Codex..." aria-label="Pesquisar no Codex" /><kbd className="rounded border border-[#344a5e] px-1.5 py-0.5 text-[10px]">⌘ K</kbd></label>{searchResults.length > 0 && <div className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-xl border border-[#35506a] bg-[#081a2a] p-1 shadow-2xl">{searchResults.map((item, index) => <button key={`${item.type}-${item.title}-${index}`} onClick={() => { item.onClick(); setSearch(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#10273b]"><span className="rounded-md border border-[#304a61] px-1.5 py-1 text-[9px] uppercase tracking-wide text-[#d5b775]">{item.type}</span><span className="min-w-0"><span className="block truncate text-sm text-[#e7edf5]">{item.title}</span><span className="block truncate text-[11px] text-[#90a5b8]">{item.detail}</span></span></button>)}</div>}</div>
              <button onClick={() => goTo("Caixa Acadêmica")} className="relative rounded-lg p-2 text-[#b5c1cf] transition-colors hover:bg-[#10263c]" aria-label="Abrir Caixa Acadêmica"><Bell className="h-5 w-5" strokeWidth={1.5} />{pendingNotices.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#c89a58]" />}</button>
              {isAuthenticated ? <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#c6a66c]/50 bg-[#112b43] text-xs font-semibold text-[#e9d6a5] sm:flex">{name.slice(0, 1).toUpperCase()}</div> : <button onClick={() => startLogin()} className="hidden rounded-lg border border-[#caa367]/50 px-3 py-2 text-xs font-medium text-[#e5cf9b] transition-colors hover:bg-[#caa367] hover:text-[#071827] sm:block">Entrar</button>}</div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
          <div className="mb-5 lg:hidden"><p className="font-serif text-2xl text-[#f0f1f4]">{headerCopy[section].title}</p><p className="mt-1 capitalize text-xs text-[#9aacbd]">{todayText}</p></div>
          {isDemo && <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-[#c5a061]/25 bg-[#c5a061]/[0.07] px-4 py-3 sm:flex-row sm:items-center"><p className="text-sm text-[#dec997]">Você está vendo uma prévia do Codex. Entre para conectar seus próprios dados acadêmicos.</p><button onClick={() => startLogin()} className="w-fit rounded-lg border border-[#c5a061]/55 px-3 py-1.5 text-xs font-medium text-[#f1d594] hover:bg-[#c5a061] hover:text-[#071827]">Entrar no Codex</button></div>}

          {section === "Hoje" && <section>
            <SectionHeading overline="Hoje" title="O que merece sua atenção" description="Seis respostas diretas para reduzir a carga mental e orientar seu próximo passo." />
            <div className="grid gap-5 xl:grid-cols-2">
              <article className="codex-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="section-label">Próxima aula</p><p className="mt-2 font-serif text-2xl text-[#eff2f5]">{nextClass?.title || "Sem aula programada"}</p></div><span className="rounded-xl border border-[#c9a66b]/30 bg-[#c9a66b]/10 p-3 text-[#d9b876]"><GraduationCap className="h-5 w-5" /></span></div>{nextClass && <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#9bafc1]"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-[#d0aa65]" />{relativeDate(nextClass.startsAt)} · {timeFormatter.format(new Date(nextClass.startsAt))}</span><span>{getSubjectName(nextClass.subjectId)}</span>{nextClass.location && <span>{nextClass.location}</span>}</div>}</article>
              <article className="codex-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="section-label">Pendências</p><p className="mt-2 font-serif text-2xl text-[#eff2f5]">{pendingTasks.length} para acompanhar</p></div><button onClick={() => requireAuth(() => setComposer("task"))} className="rounded-lg border border-[#31506b] p-2 text-[#d7bd87] hover:border-[#caa367]" aria-label="Nova pendência"><Plus className="h-4 w-4" /></button></div><div className="mt-4 divide-y divide-[#1a334b]">{pendingTasks.length ? pendingTasks.map(task => <label key={task.id} className="flex cursor-pointer items-start gap-3 py-3 first:pt-0"><input checked={task.isCompleted} onChange={() => toggleTask(task)} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[#496175] accent-[#c5a061]" /><span className="min-w-0 flex-1"><span className="block text-sm text-[#e1e7ed]">{task.title}</span><span className="mt-1 block text-[11px] text-[#8ca0b4]">{getSubjectName(task.subjectId)}</span></span><span className="text-[11px] text-[#c9a76d]">{relativeDate(task.dueAt)}</span></label>) : <p className="py-4 text-sm text-[#91a5b7]">Nenhuma pendência urgente.</p>}</div></article>
              <article className="codex-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="section-label">Próximos eventos</p><p className="mt-2 font-serif text-2xl text-[#eff2f5]">Agenda acadêmica</p></div><button onClick={() => goTo("Agenda")} className="text-xs text-[#d9bd82] hover:text-[#f1d99f]">Ver agenda</button></div><div className="mt-4 space-y-2">{upcomingEvents.length ? upcomingEvents.map(event => <div key={event.id} className="flex items-center gap-3 rounded-lg border border-[#1d3951] bg-[#081827]/55 px-3 py-2.5"><div className="w-10 text-center"><p className="font-serif text-xl text-[#edf1f4]">{new Date(event.startsAt).getDate()}</p><p className="text-[9px] uppercase text-[#8fa3b5]">{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(event.startsAt)).replace(".", "")}</p></div><div className="min-w-0 flex-1"><p className="truncate text-sm text-[#e6edf3]">{event.title}</p><p className="mt-0.5 text-[11px] text-[#8ea2b4]">{eventLabels[event.type]} · {getSubjectName(event.subjectId)}</p></div><SourceBadge source={event.source} /></div>) : <p className="py-4 text-sm text-[#91a5b7]">Nenhum evento próximo.</p>}</div></article>
              <article className="codex-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="section-label">Novidades</p><p className="mt-2 font-serif text-2xl text-[#eff2f5]">Caixa Acadêmica</p></div><button onClick={() => goTo("Caixa Acadêmica")} className="text-xs text-[#d9bd82] hover:text-[#f1d99f]">Abrir caixa</button></div><div className="mt-4 space-y-2">{inbox.slice(0, 3).map(notice => <div key={notice.id} className="flex items-start gap-3 rounded-lg border border-[#1d3951] bg-[#081827]/55 px-3 py-2.5"><span className={`mt-1.5 h-2 w-2 rounded-full ${notice.reviewStatus === "pending" ? "bg-[#d3a866]" : "bg-emerald-300"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm text-[#e6edf3]">{notice.title}</p><p className="mt-0.5 line-clamp-1 text-[11px] text-[#8ea2b4]">{notice.summary || "Novo aviso acadêmico."}</p></div><SourceBadge source={notice.source} /></div>)}</div></article>
              <article className="codex-card p-5 sm:p-6"><p className="section-label">Resumo da semana</p><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="font-serif text-3xl text-[#e9d09b]">{weekEvents}</p><p className="mt-1 text-[11px] text-[#8ea2b4]">eventos</p></div><div><p className="font-serif text-3xl text-[#e9d09b]">{pendingTasks.length}</p><p className="mt-1 text-[11px] text-[#8ea2b4]">pendências</p></div><div><p className="font-serif text-3xl text-[#e9d09b]">{pendingNotices.length}</p><p className="mt-1 text-[11px] text-[#8ea2b4]">a revisar</p></div></div><p className="mt-5 border-t border-[#1b354c] pt-4 text-sm text-[#a3b3c2]">O Codex organiza as informações recebidas; você confirma o que entra na sua rotina.</p></article>
              <article className="codex-card p-5 sm:p-6"><p className="section-label">Atividades concluídas</p><div className="mt-4 flex items-end justify-between gap-4"><div><p className="font-serif text-4xl text-[#e9d09b]">{Math.round((completedTasks / Math.max(tasks.length, 1)) * 100)}%</p><p className="mt-1 text-sm text-[#9dafc0]">{completedTasks} de {tasks.length} atividades concluídas</p></div><CheckCircle2 className="h-10 w-10 text-emerald-300/80" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#1a334b]"><div className="h-full rounded-full bg-gradient-to-r from-[#b99354] to-[#e1c17f]" style={{ width: `${Math.round((completedTasks / Math.max(tasks.length, 1)) * 100)}%` }} /></div></article>
            </div>
          </section>}

          {section === "Disciplinas" && <section>
            <SectionHeading overline="Disciplinas" title="Seu percurso de estudo" description="Toda disciplina utiliza a mesma estrutura: informações, encontros, materiais, leituras, provas e tarefas." action={<button onClick={() => requireAuth(() => setComposer("subject"))} className="inline-flex items-center gap-2 rounded-lg border border-[#c7a061]/45 px-3 py-2 text-xs font-medium text-[#e5cd96] hover:bg-[#c7a061] hover:text-[#071827]"><Plus className="h-3.5 w-3.5" />Nova disciplina</button>} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{subjects.map(subject => <button key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={`text-left codex-card p-5 transition ${selectedSubject?.id === subject.id ? "border-[#c9a66b]/65" : ""}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#29445d] bg-[#102338] text-lg" style={{ color: subject.color }}>⚖</span><p className="mt-5 font-serif text-xl text-[#edf1f7]">{subject.name}</p><p className="mt-1.5 text-xs text-[#93a5b9]">{subject.professor || "Professor(a) não informado(a)"}</p><div className="mt-4 flex items-center justify-between border-t border-[#1c3248] pt-3 text-xs text-[#8fa2b5]"><span>{subject.scheduleNote || "Horário a confirmar"}</span><span>{subject.room || "Sala a confirmar"}</span></div></button>)}</div>
            {selectedSubject && <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="codex-card p-5 sm:p-6"><p className="section-label">{selectedSubject.name}</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Professor", selectedSubject.professor || "Não informado"], ["Horários", selectedSubject.scheduleNote || "A confirmar"], ["Sala", selectedSubject.room || "A confirmar"], ["Materiais", `${persistedMaterials.filter(item => item.subjectId === selectedSubject.id).length} salvos`]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#203b54] bg-[#081827]/55 p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#d1ad69]">{label}</p><p className="mt-2 text-sm text-[#e5ebf1]">{value}</p></div>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#203b54] bg-[#081827]/55 p-4"><p className="text-sm font-medium text-[#e5ebf1]">Próximos eventos</p><div className="mt-3 space-y-2">{sortedEvents.filter(event => event.subjectId === selectedSubject.id).slice(0, 3).map(event => <p key={event.id} className="text-xs text-[#9badbd]">{eventLabels[event.type]} · {event.title} · {dateFormatter.format(new Date(event.startsAt))}</p>) || <p className="text-xs text-[#9badbd]">Nenhum evento associado.</p>}</div></div><div className="rounded-xl border border-[#203b54] bg-[#081827]/55 p-4"><p className="text-sm font-medium text-[#e5ebf1]">Leituras e tarefas</p><div className="mt-3 space-y-2">{tasks.filter(task => task.subjectId === selectedSubject.id).slice(0, 3).map(task => <p key={task.id} className="text-xs text-[#9badbd]">{task.isCompleted ? "Concluída" : "Pendente"} · {task.title}</p>) || <p className="text-xs text-[#9badbd]">Nenhuma tarefa associada.</p>}</div></div></div></section><aside className="codex-card p-5"><p className="section-label">Ação rápida</p><p className="mt-2 font-serif text-xl text-[#e9edf4]">Organize o próximo encontro</p><p className="mt-2 text-sm leading-relaxed text-[#99aabd]">Registre uma aula, uma leitura, uma prova ou uma audiência sempre vinculada à disciplina.</p><button onClick={() => requireAuth(() => setComposer("event"))} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#c7a061] px-3 py-2 text-xs font-semibold text-[#071827] hover:bg-[#e2c17f]"><Plus className="h-3.5 w-3.5" />Novo evento</button></aside></div>}
            <div className="mt-5"><LessonTopicsPanel subjects={persistedSubjects} topics={lessonTopics} /></div>
          </section>}

          {section === "Agenda" && <section>
            <SectionHeading overline="Agenda" title="Todo compromisso vira um Evento Acadêmico" description="Aulas, provas, trabalhos, seminários, leituras e audiências em uma única linha do tempo, com origem identificável." action={<button onClick={() => requireAuth(() => setComposer("event"))} className="inline-flex items-center gap-2 rounded-lg border border-[#c7a061]/45 px-3 py-2 text-xs font-medium text-[#e5cd96] hover:bg-[#c7a061] hover:text-[#071827]"><Plus className="h-3.5 w-3.5" />Novo evento</button>} />
            <div className="space-y-3">{sortedEvents.map(event => <article key={event.id} className="codex-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"><div className="w-16 shrink-0 text-center"><p className="font-serif text-3xl text-[#edf1f6]">{new Date(event.startsAt).getDate()}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[#9dafbf]">{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(event.startsAt)).replace(".", "")}</p></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-serif text-xl text-[#e9eef4]">{event.title}</p><span className="rounded-full border border-[#314d66] bg-[#10243a] px-2 py-1 text-[10px] text-[#c2d0db]">{eventLabels[event.type] || "Evento"}</span></div><p className="mt-1 text-sm text-[#98aabc]">{getSubjectName(event.subjectId)} · {timeFormatter.format(new Date(event.startsAt))}{event.location ? ` · ${event.location}` : ""}</p></div><SourceBadge source={event.source} /></article>)}</div>
          </section>}

          {section === "Caixa Acadêmica" && <section>
            <SectionHeading overline="Caixa Acadêmica" title="Tudo o que exige sua atenção" description="O Codex reúne sinais das integrações e cria sugestões. Nenhuma informação automática se torna oficial sem a sua revisão." action={<button onClick={refreshInbox} disabled={authorizeGoogle.isPending || syncGoogle.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#c7a061] px-3 py-2 text-xs font-semibold text-[#071827] hover:bg-[#e2c17f] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${(authorizeGoogle.isPending || syncGoogle.isPending) ? "animate-spin" : ""}`} />{googleConnected ? "Atualizar caixa" : "Conectar Google"}</button>} />
            <div className="mb-5 grid gap-3 md:grid-cols-3">{["gmail", "classroom", "calendar"].map(source => { const connection = integrationsQuery.data?.find(item => (source === "classroom" ? item.provider === "google_classroom" : source === "calendar" ? item.provider === "google_calendar" : item.provider === "gmail")); return <div key={source} className="codex-card flex items-center justify-between p-4"><div><p className="text-sm text-[#e6edf3]">{sourceLabels[source]}</p><p className="mt-1 text-[11px] text-[#91a4b7]">{connection?.status === "connected" ? "Conectado e sincronizado" : "Aguardando conexão"}</p></div><span className={`h-2.5 w-2.5 rounded-full ${connection?.status === "connected" ? "bg-emerald-300" : "bg-[#c9a66b]"}`} /></div>; })}</div>
            <div className="overflow-hidden rounded-xl border border-[#203b54] bg-[#071827]/50">{inbox.map(notice => <article key={notice.id} className="border-b border-[#1b354c] p-4 last:border-0 sm:p-5"><div className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notice.reviewStatus === "pending" ? "bg-[#d3a866]" : notice.reviewStatus === "dismissed" ? "bg-[#62788b]" : "bg-emerald-300"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-[#e8eef5]">{notice.title}</p><SourceBadge source={notice.source} /></div><p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#98aabc]">{notice.summary || "Novo aviso acadêmico disponível."}</p><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#c7a66b]">{notice.subjectName || getSubjectName(notice.subjectId)} · recebido em {dateFormatter.format(new Date(notice.receivedAt))}</p>{notice.reviewStatus === "pending" ? <div className="mt-4 flex flex-wrap items-center gap-2"><span className="basis-full text-xs text-[#aab9c6]">Sugestão do Codex: confirmar antes de criar uma tarefa ou evento acadêmico.</span>{notice.id > 0 && <><button onClick={() => reviewNotice.mutate({ id: notice.id, reviewStatus: "approved" })} disabled={reviewNotice.isPending} className="rounded-md border border-emerald-300/40 px-2.5 py-1.5 text-[11px] text-emerald-100 hover:bg-emerald-300/10">Confirmar sugestão</button><button onClick={() => reviewNotice.mutate({ id: notice.id, reviewStatus: "dismissed" })} disabled={reviewNotice.isPending} className="rounded-md border border-[#526a80] px-2.5 py-1.5 text-[11px] text-[#b7c4d0] hover:bg-[#1a334a]">Descartar</button></>}</div> : <span className={`mt-4 inline-flex rounded-md border px-2.5 py-1.5 text-[11px] ${notice.reviewStatus === "approved" ? "border-emerald-300/30 text-emerald-100" : "border-[#526a80] text-[#aebdca]"}`}>{notice.reviewStatus === "approved" ? "Revisado e confirmado" : "Descartado"}</span>}</div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#8297aa]" /></div></article>)}</div>
          </section>}

          {section === "Materiais" && <section><SectionHeading overline="Materiais" title="Biblioteca organizada" description="Links e arquivos pertencem a uma disciplina, ficam sob seu controle e podem ser encontrados sem procurar em vários aplicativos." /><MaterialsPanel subjects={persistedSubjects} materials={persistedMaterials} /></section>}

          {section === "Configurações" && <section><SectionHeading overline="Configurações" title="Sua conta, suas integrações" description="Defina como o Codex organiza seu percurso e escolha quando as fontes conectadas devem ser atualizadas." /><AcademicProfilePanel profile={dashboardQuery.data?.profile} semesters={dashboardQuery.data?.semesters ?? []} /><section className="codex-card p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="section-label">Atualização automática</p><p className="mt-2 font-serif text-2xl text-[#edf1f6]">Caixa Acadêmica atualizada</p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9eafc0]">Quando ativa, a sincronização verifica Gmail, Classroom e Agenda a cada 15 minutos. Você continua revisando cada sugestão antes de confirmar.</p></div><button onClick={() => requireAuth(() => autoSyncEnabled ? disableAutoSync.mutate() : enableAutoSync.mutate())} disabled={!googleConnected || enableAutoSync.isPending || disableAutoSync.isPending} className={`rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${autoSyncEnabled ? "border-[#b97970]/50 text-[#e1aaa0] hover:bg-[#45231f]" : "border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10"}`}>{autoSyncEnabled ? "Pausar atualizações" : "Ativar atualizações"}</button></div></section></section>}
        </main>
      </div>

      {menuOpen && <div className="fixed inset-0 z-50 bg-[#020a12]/80 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}><aside className="h-full w-[292px] border-r border-[#213a52] bg-[#061523] p-4 shadow-2xl" onClick={event => event.stopPropagation()}><div className="mb-6 flex items-center justify-between border-b border-[#1d3851] pb-4"><div className="flex items-center gap-3"><img src={brandIconUrl} alt="Codex" className="h-11 w-11 rounded-xl border border-[#c9a66b]/35 object-cover" /><div><p className="font-serif text-lg text-[#e9edf4]">CODEX</p><p className="text-[9px] tracking-[0.16em] text-[#a88b5f]">DIREITO · UFRJ</p></div></div><button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-[#a4b4c4]" aria-label="Fechar menu"><X className="h-5 w-5" /></button></div><nav className="space-y-1">{navigation.map(item => <NavItem key={item.label} item={item} active={section === item.label} onClick={() => goTo(item.label)} />)}</nav><button onClick={() => isAuthenticated ? goTo("Configurações") : startLogin()} className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#caa367]/40 px-3 py-2.5 text-sm text-[#e5cf9b]">{isAuthenticated ? "Configurar conta" : "Entrar ou criar conta"}<CircleUserRound className="h-4 w-4" /></button></aside></div>}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#1d3851] bg-[#061523]/95 px-1 py-1.5 backdrop-blur lg:hidden" aria-label="Navegação móvel">{navigation.slice(0, 5).map(item => <NavItem key={item.label} item={item} active={section === item.label} onClick={() => goTo(item.label)} compact />)}</nav>
      <AcademicComposer type={composer} subjects={persistedSubjects.map(subject => ({ id: subject.id, name: subject.name }))} semesters={(dashboardQuery.data?.semesters ?? []).map(semester => ({ id: semester.id, name: semester.name, isCurrent: semester.isCurrent }))} onClose={() => setComposer(null)} />
    </div>
  );
}
