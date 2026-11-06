"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "inicio" | "comunidades" | "proyectos" | "aprendizaje" | "desafios" | "mensajes" | "notificaciones" | "perfil";
type Profile = {
  id: string; first_name: string; last_name: string; career: string | null;
  university_name: string | null; role: string; show_role: boolean;
  bio: string | null; avatar_url?: string | null; preferred_language?: string;
};
type Community = { id: string; name: string; description: string; created_by: string; created_at: string };
type Invite = { community_id: string; code: string };
type Project = { id: string; user_id: string; title: string; description: string; category: string; tags: string[]; created_at: string };
type ProjectComment = { id: string; project_id: string; user_id: string; content: string; created_at: string };
type ProjectLike = { project_id: string; user_id: string };
type Resource = { id: string; slug: string; title: string; description: string; category: string; level: string; content: string; url: string | null };
type Question = { question: string; options: string[]; answer: number; explanation?: string };
type Challenge = { id: string; title: string; description: string; category: string; difficulty: string; questions: Question[] };
type Attempt = { id: string; challenge_id: string; score: number; total: number; completed_at: string };
type Person = { id: string; first_name: string; last_name: string; role: string; career: string | null };
type Conversation = { id: string; created_at: string };
type ConversationMember = { conversation_id: string; user_id: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type Notification = { id: string; type: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string };

const roleNames: Record<string, string> = { student: "Estudiante", professor: "Profesor", external: "Externo" };
const nav: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "🏠" },
  { id: "comunidades", label: "Comunidades", icon: "👥" },
  { id: "proyectos", label: "Proyectos", icon: "🚀" },
  { id: "aprendizaje", label: "Aprendizaje IA", icon: "🧠" },
  { id: "desafios", label: "Desafíos", icon: "🎮" },
  { id: "mensajes", label: "Mensajes", icon: "✉️" },
  { id: "notificaciones", label: "Notificaciones", icon: "🔔" },
  { id: "perfil", label: "Mi perfil", icon: "👤" },
];

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const buttonClass = "rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50";
const cardClass = "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("inicio");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [likes, setLikes] = useState<ProjectLike[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedConversation, setSelectedConversation] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState("Tecnología");
  const [projectTags, setProjectTags] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [messageDraft, setMessageDraft] = useState("");
  const [newMessageUser, setNewMessageUser] = useState("");
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", career: "", university_name: "", bio: "", avatar_url: "", show_role: true });

  function notify(message: string, error = false) {
    setNotice(message);
    setNoticeError(error);
    window.setTimeout(() => setNotice(""), 5000);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace("/registro");
        return;
      }
      const currentUser = authData.user;
      setUserId(currentUser.id);
      setEmail(currentUser.email ?? "");

      const { data: profileData } = await supabase.from("profiles")
        .select("id,first_name,last_name,career,university_name,role,show_role,bio,avatar_url,preferred_language")
        .eq("id", currentUser.id).maybeSingle();
      const p = (profileData ?? null) as Profile | null;
      setProfile(p);
      setProfileForm({
        first_name: p?.first_name ?? String(currentUser.user_metadata?.first_name ?? ""),
        last_name: p?.last_name ?? String(currentUser.user_metadata?.last_name ?? ""),
        career: p?.career ?? "",
        university_name: p?.university_name ?? "",
        bio: p?.bio ?? "",
        avatar_url: p?.avatar_url ?? "",
        show_role: p?.show_role ?? true,
      });

      const { data: membershipData } = await supabase.from("community_members")
        .select("community_id").eq("user_id", currentUser.id);
      const communityIds = [...new Set((membershipData ?? []).map((m: { community_id: string }) => m.community_id))];
      if (communityIds.length) {
        const { data: communityData } = await supabase.from("communities").select("*")
          .in("id", communityIds).order("created_at", { ascending: false });
        setCommunities((communityData ?? []) as Community[]);
        const { data: inviteData } = await supabase.from("community_invites").select("community_id,code")
          .in("community_id", communityIds);
        setInvites((inviteData ?? []) as Invite[]);
      } else {
        setCommunities([]);
        setInvites([]);
      }

      const [
        projectResult, commentResult, likeResult, resourceResult,
        challengeResult, attemptResult, notificationResult, peopleResult
      ] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(60),
        supabase.from("project_comments").select("*").order("created_at", { ascending: true }).limit(250),
        supabase.from("project_likes").select("project_id,user_id").limit(1000),
        supabase.from("learning_resources").select("*").order("created_at", { ascending: false }),
        supabase.from("challenges").select("*").order("created_at", { ascending: false }),
        supabase.from("challenge_attempts").select("*").eq("user_id", currentUser.id).order("completed_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("profiles").select("id,first_name,last_name,role,career").neq("id", currentUser.id).limit(60),
      ]);
      setProjects((projectResult.data ?? []) as Project[]);
      setComments((commentResult.data ?? []) as ProjectComment[]);
      setLikes((likeResult.data ?? []) as ProjectLike[]);
      setResources((resourceResult.data ?? []) as Resource[]);
      setChallenges((challengeResult.data ?? []) as Challenge[]);
      setAttempts((attemptResult.data ?? []) as Attempt[]);
      setNotifications((notificationResult.data ?? []) as Notification[]);
      setPeople((peopleResult.data ?? []) as Person[]);

      const { data: membershipRows } = await supabase.from("conversation_members")
        .select("conversation_id,user_id").eq("user_id", currentUser.id);
      const conversationIds = [...new Set((membershipRows ?? []).map((m: ConversationMember) => m.conversation_id))];
      if (conversationIds.length) {
        const [conversationResult, memberResult, messageResult] = await Promise.all([
          supabase.from("conversations").select("*").in("id", conversationIds).order("created_at", { ascending: false }),
          supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", conversationIds),
          supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: true }).limit(500),
        ]);
        setConversations((conversationResult.data ?? []) as Conversation[]);
        setMembers((memberResult.data ?? []) as ConversationMember[]);
        setMessages((messageResult.data ?? []) as Message[]);
        if (!selectedConversation && conversationIds[0]) setSelectedConversation(conversationIds[0]);
      } else {
        setConversations([]); setMembers([]); setMessages([]);
      }
    } catch (error) {
      console.error(error);
      notify("No se pudieron cargar todos los datos. Revisa las tablas y políticas de Supabase.", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAll(); /* initial load */ }, []);

  const displayName = `${profile?.first_name ?? "Usuario"} ${profile?.last_name ?? ""}`.trim();
  const role = profile?.role ?? "";
  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const activeMessages = messages.filter((m) => m.conversation_id === selectedConversation);
  const selectedMembers = members.filter((m) => m.conversation_id === selectedConversation);
  const otherMember = selectedMembers.find((m) => m.user_id !== userId);
  const otherPerson = people.find((p) => p.id === otherMember?.user_id);

  async function createCommunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "professor") return notify("Solo los profesores pueden crear comunidades.", true);
    setBusy(true);
    try {
      const { data, error } = await supabase.from("communities").insert({
        name: communityName.trim(),
        description: communityDescription.trim() || "Comunidad de aprendizaje de AulaViva.",
        created_by: userId,
      }).select("id").single();
      if (error) throw error;
      const communityId = data.id as string;

      // Compatible con instalaciones que ya tengan un trigger de membresía/invitación.
      const { data: existingMember } = await supabase.from("community_members").select("id")
        .eq("community_id", communityId).eq("user_id", userId).maybeSingle();
      if (!existingMember) {
        const { error: memberError } = await supabase.from("community_members")
          .insert({ community_id: communityId, user_id: userId });
        if (memberError && memberError.code !== "23505") throw memberError;
      }
      const { data: existingInvite } = await supabase.from("community_invites").select("id")
        .eq("community_id", communityId).maybeSingle();
      if (!existingInvite) {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const { error: inviteError } = await supabase.from("community_invites")
          .insert({ community_id: communityId, code });
        if (inviteError && inviteError.code !== "23505") throw inviteError;
      }
      setCommunityName(""); setCommunityDescription("");
      await loadAll();
      notify("¡Comunidad creada correctamente!");
    } catch (error) {
      console.error(error);
      notify("No se pudo crear la comunidad. Verifica las políticas de communities, community_members y community_invites.", true);
    } finally { setBusy(false); }
  }

  async function joinCommunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.rpc("join_community_by_code", { p_code: inviteCode.trim().toUpperCase().replace(/\s+/g, "") });
      if (error) throw error;
      setInviteCode("");
      await loadAll();
      notify("¡Te uniste a la comunidad!");
    } catch (error) {
      console.error(error);
      notify("Código inválido o no tienes permisos para unirte.", true);
    } finally { setBusy(false); }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectTitle.trim() || !projectDescription.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("projects").insert({
        user_id: userId,
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        category: projectCategory,
        tags: projectTags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      });
      if (error) throw error;
      setProjectTitle(""); setProjectDescription(""); setProjectTags("");
      await loadAll();
      notify("Tu proyecto se publicó correctamente.");
    } catch (error) {
      console.error(error);
      notify("No se pudo publicar el proyecto. Revisa la tabla projects y sus políticas.", true);
    } finally { setBusy(false); }
  }

  async function deleteProject(projectId: string) {
    if (!window.confirm("¿Seguro que deseas eliminar este proyecto?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", userId);
    if (error) return notify("No se pudo eliminar el proyecto.", true);
    await loadAll(); notify("Proyecto eliminado.");
  }

  async function toggleLike(projectId: string) {
    const existing = likes.find((like) => like.project_id === projectId && like.user_id === userId);
    const result = existing
      ? await supabase.from("project_likes").delete().eq("project_id", projectId).eq("user_id", userId)
      : await supabase.from("project_likes").insert({ project_id: projectId, user_id: userId });
    if (result.error) return notify("No se pudo registrar tu reacción.", true);
    const { data } = await supabase.from("project_likes").select("project_id,user_id").limit(1000);
    setLikes((data ?? []) as ProjectLike[]);
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>, projectId: string) {
    event.preventDefault();
    const content = (commentDrafts[projectId] ?? "").trim();
    if (!content) return;
    const { error } = await supabase.from("project_comments").insert({ project_id: projectId, user_id: userId, content });
    if (error) return notify("No se pudo publicar el comentario.", true);
    setCommentDrafts((prev) => ({ ...prev, [projectId]: "" }));
    const { data } = await supabase.from("project_comments").select("*").order("created_at", { ascending: true }).limit(250);
    setComments((data ?? []) as ProjectComment[]);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) return notify("Completa tus nombres y apellidos.", true);
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        career: profileForm.career.trim() || null,
        university_name: profileForm.university_name.trim() || null,
        bio: profileForm.bio.trim() || null,
        avatar_url: profileForm.avatar_url.trim() || null,
        show_role: profileForm.show_role,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      if (error) throw error;
      await loadAll(); notify("Perfil actualizado correctamente.");
    } catch (error) {
      console.error(error); notify("No se pudo guardar el perfil. Revisa la política UPDATE de profiles.", true);
    } finally { setBusy(false); }
  }

  async function startConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMessageUser) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_conversation", { p_other_user: newMessageUser });
      if (error) throw error;
      const conversationId = data as string;
      await loadAll();
      setSelectedConversation(conversationId);
      setTab("mensajes");
      setNewMessageUser("");
    } catch (error) {
      console.error(error); notify("No se pudo iniciar la conversación. Ejecuta la función SQL incluida.", true);
    } finally { setBusy(false); }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageDraft.trim() || !selectedConversation) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation, sender_id: userId, body: messageDraft.trim(),
    });
    if (error) return notify("No se pudo enviar el mensaje.", true);
    setMessageDraft("");
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", selectedConversation).order("created_at", { ascending: true }).limit(200);
    setMessages((prev) => [...prev.filter((m) => m.conversation_id !== selectedConversation), ...((data ?? []) as Message[])]);
  }

  async function markNotificationRead(id: string) {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    if (!error) setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function submitChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChallenge) return;
    const total = selectedChallenge.questions.length;
    const score = selectedChallenge.questions.reduce((sum, q, index) => sum + (answers[index] === q.answer ? 1 : 0), 0);
    const { error } = await supabase.from("challenge_attempts").insert({
      user_id: userId, challenge_id: selectedChallenge.id, score, total, answers,
    });
    if (error) return notify("No se pudo guardar tu resultado. Revisa challenge_attempts.", true);
    setSelectedChallenge(null); setAnswers({});
    const { data } = await supabase.from("challenge_attempts").select("*").eq("user_id", userId).order("completed_at", { ascending: false });
    setAttempts((data ?? []) as Attempt[]);
    notify(`¡Terminaste! Tu resultado fue ${score}/${total}.`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/registro");
    router.refresh();
  }

  const initials = `${profile?.first_name?.[0] ?? "A"}${profile?.last_name?.[0] ?? ""}`.toUpperCase();

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600"><div className="text-center"><div className="mb-3 text-4xl">💜</div><p className="font-semibold">Cargando AulaViva...</p></div></main>;

  return (
    <main className="min-h-screen bg-[#F5F6FC] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-100 bg-white p-5 lg:flex">
          <a href="#inicio" onClick={() => setTab("inicio")} className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-xl font-black text-white">A</div>
            <div><div className="text-xl font-black">Aula<span className="text-violet-600">Viva</span></div><div className="text-[9px] font-bold tracking-[2px] text-slate-400">APRENDE · COMPARTE · CRECE</div></div>
          </a>
          <p className="mb-3 px-3 text-[10px] font-bold tracking-widest text-slate-400">MENÚ PRINCIPAL</p>
          <nav className="space-y-1">
            {nav.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setSelectedResource(null); setSelectedChallenge(null); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${tab === item.id ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><span>{item.icon}</span>{item.label}{item.id === "notificaciones" && unreadCount > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}</button>)}
          </nav>
          <div className="mt-auto border-t border-slate-100 pt-5">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{displayName}</p><p className="text-xs text-slate-400">{roleNames[role] ?? "Miembro"}</p></div></div>
            <button onClick={logout} className="mt-4 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50">↪ Cerrar sesión</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
            <div><p className="text-xs font-semibold text-slate-400">AULAVIVA / ESPACIO PERSONAL</p><h1 className="text-lg font-extrabold">{nav.find((n) => n.id === tab)?.label ?? "Dashboard"}</h1></div>
            <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{email}</span><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-teal-400 font-bold text-white">{initials}</div><button onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 lg:hidden">Salir</button></div>
          </header>

          {notice && <div className={`mx-5 mt-4 rounded-xl px-4 py-3 text-sm font-medium ${noticeError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{notice}</div>}

          <div className="mx-auto max-w-7xl space-y-6 p-5 xl:p-8">
            <nav className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-2 shadow-sm lg:hidden">
              {nav.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${tab === item.id ? "bg-violet-100 text-violet-700" : "text-slate-500"}`}><span className="block text-lg">{item.icon}</span>{item.label}</button>)}
            </nav>

            {tab === "inicio" && <>
              <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-violet-500 to-teal-500 p-7 text-white sm:p-9">
                <p className="text-xs font-bold tracking-widest text-white/75">TU ESPACIO DE APRENDIZAJE</p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">¡Hola, {profile?.first_name ?? "bienvenido"}! 👋<br/>Nos alegra tenerte aquí.</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/85">Comparte tus proyectos, conecta con estudiantes y profesores, aprende sobre inteligencia artificial y participa en desafíos.</p>
                <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setTab("proyectos")} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700">Explorar proyectos →</button><button onClick={() => setTab("comunidades")} className="rounded-xl border border-white/50 px-5 py-3 text-sm font-bold text-white">Ver comunidades</button></div>
              </section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["👥", "Comunidades", communities.length],
                  ["🚀", "Proyectos", projects.length],
                  ["🧠", "Recursos", resources.length],
                  ["🏆", "Desafíos completados", attempts.length],
                ].map(([icon, label, value]) => <div key={String(label)} className={cardClass}><div className="flex items-center justify-between"><span className="text-2xl">{icon}</span><span className="text-2xl font-black text-violet-700">{value}</span></div><p className="mt-3 text-sm font-semibold text-slate-500">{label}</p></div>)}
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <section className={cardClass}><div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold">Proyectos recientes</h3><button onClick={() => setTab("proyectos")} className="text-xs font-bold text-violet-600">Ver todos →</button></div>{projects.slice(0, 4).map((project) => <div key={project.id} className="border-t border-slate-100 py-3"><p className="font-bold">{project.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description}</p></div>)}{projects.length === 0 && <p className="text-sm text-slate-400">Todavía no hay proyectos publicados.</p>}</section>
                <section className={cardClass}><div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold">Aprende algo nuevo</h3><button onClick={() => setTab("aprendizaje")} className="text-xs font-bold text-violet-600">Ver recursos →</button></div>{resources.slice(0, 4).map((resource) => <button key={resource.id} onClick={() => { setSelectedResource(resource); setTab("aprendizaje"); }} className="block w-full border-t border-slate-100 py-3 text-left"><p className="font-bold">{resource.title}</p><p className="mt-1 text-sm text-slate-500">{resource.description}</p></button>)}{resources.length === 0 && <p className="text-sm text-slate-400">Ejecuta el SQL de instalación para cargar los recursos.</p>}</section>
              </div>
            </>}

            {tab === "comunidades" && <section className="space-y-5">
              <div className={cardClass}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Comunidades de AulaViva 👥</h2><p className="mt-1 text-sm text-slate-500">Espacios para conectar, aprender y compartir.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{communities.length} comunidades</span></div>
                {role === "professor" && <form onSubmit={createCommunity} className="mt-5 space-y-3 rounded-2xl bg-violet-50/70 p-4"><h3 className="font-bold">Crear una comunidad</h3><input className={inputClass} value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder="Nombre de la comunidad" maxLength={100} required/><textarea className={inputClass} value={communityDescription} onChange={(e) => setCommunityDescription(e.target.value)} placeholder="Descripción" rows={3}/><button className={buttonClass} disabled={busy}>+ Crear comunidad</button></form>}
                {role === "student" && <form onSubmit={joinCommunity} className="mt-5 space-y-3 rounded-2xl bg-violet-50/70 p-4"><h3 className="font-bold">Unirme mediante código</h3><input className={inputClass} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Código de invitación" required/><button className={buttonClass} disabled={busy}>Unirme a la comunidad →</button></form>}
                <div className="mt-6"><h3 className="mb-3 font-extrabold">Mis comunidades</h3>{communities.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Aún no perteneces a ninguna comunidad.</p> : <div className="grid gap-3 md:grid-cols-2">{communities.map((community) => <article key={community.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start gap-3"><span className="text-2xl">👥</span><div className="min-w-0 flex-1"><h4 className="font-bold">{community.name}</h4><p className="mt-1 text-sm text-slate-500">{community.description}</p>{community.created_by === userId && <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Creada por ti</span>}</div></div>{community.created_by === userId && invites.find((i) => i.community_id === community.id) && <div className="mt-4 rounded-lg bg-violet-50 p-3"><p className="text-[10px] font-bold tracking-wider text-slate-500">CÓDIGO DE INVITACIÓN</p><p className="mt-1 select-all font-mono text-xl font-black tracking-widest text-violet-700">{invites.find((i) => i.community_id === community.id)?.code}</p></div>}</article>)}</div>}</div>
              </div>
            </section>}

            {tab === "proyectos" && <section className="space-y-5">
              <form onSubmit={createProject} className={cardClass}><h2 className="text-xl font-extrabold">Comparte un proyecto 🚀</h2><p className="mt-1 text-sm text-slate-500">Presenta tus ideas y recibe comentarios de la comunidad.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Nombre del proyecto" maxLength={120} required/><select className={inputClass} value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)}><option>Tecnología</option><option>Educación</option><option>Inteligencia artificial</option><option>Ciencia</option><option>Emprendimiento</option><option>Otro</option></select></div><textarea className={`${inputClass} mt-3`} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Describe tu proyecto, su objetivo y cómo funciona..." rows={4} maxLength={2000} required/><input className={`${inputClass} mt-3`} value={projectTags} onChange={(e) => setProjectTags(e.target.value)} placeholder="Etiquetas separadas por comas (ej. React, IA, educación)"/><button className={`${buttonClass} mt-3`} disabled={busy}>Publicar proyecto →</button></form>
              <div className="space-y-4">{projects.map((project) => { const projectLikes = likes.filter((l) => l.project_id === project.id); const liked = projectLikes.some((l) => l.user_id === userId); const projectComments = comments.filter((c) => c.project_id === project.id); return <article key={project.id} className={cardClass}><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">{project.category}</span><h3 className="mt-2 text-lg font-extrabold">{project.title}</h3><p className="mt-1 text-xs text-slate-400">{project.user_id === userId ? "Publicado por ti" : "Publicado por un miembro"} · {new Date(project.created_at).toLocaleDateString()}</p></div>{project.user_id === userId && <button onClick={() => deleteProject(project.id)} className="text-xs font-bold text-rose-600">Eliminar</button>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{project.description}</p>{project.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{project.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">#{tag}</span>)}</div>}<div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3"><button onClick={() => toggleLike(project.id)} className={`text-sm font-bold ${liked ? "text-violet-700" : "text-slate-500"}`}>{liked ? "💜" : "♡"} {projectLikes.length} Me gusta</button><span className="text-sm text-slate-400">💬 {projectComments.length} comentarios</span></div><div className="mt-3 space-y-2">{projectComments.slice(-4).map((comment) => <div key={comment.id} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold">{comment.user_id === userId ? "Tú" : "Miembro de AulaViva"}</p><p className="mt-1 text-sm text-slate-600">{comment.content}</p></div>)}</div><form onSubmit={(e) => addComment(e, project.id)} className="mt-3 flex gap-2"><input className={inputClass} value={commentDrafts[project.id] ?? ""} onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [project.id]: e.target.value }))} placeholder="Escribe un comentario..." maxLength={500}/><button className="rounded-xl bg-slate-800 px-4 text-sm font-bold text-white">Enviar</button></form></article>; })}{projects.length === 0 && <div className={cardClass}><p className="text-center text-sm text-slate-500">Todavía no hay proyectos. ¡Publica el primero!</p></div>}</div>
            </section>}

            {tab === "aprendizaje" && <section className="space-y-5"><div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-7 text-white"><p className="text-xs font-bold tracking-widest text-white/70">AULAVIVA ACADEMY</p><h2 className="mt-2 text-2xl font-black">Aprende sobre inteligencia artificial 🧠</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">Explora recursos introductorios y desarrolla habilidades para estudiar, crear y trabajar con IA.</p></div>{selectedResource && <article className={cardClass}><button onClick={() => setSelectedResource(null)} className="mb-3 text-xs font-bold text-violet-600">← Volver a recursos</button><span className="text-xs font-bold uppercase tracking-wider text-violet-600">{selectedResource.category} · {selectedResource.level}</span><h2 className="mt-2 text-2xl font-black">{selectedResource.title}</h2><p className="mt-2 text-slate-500">{selectedResource.description}</p><div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedResource.content}</div>{selectedResource.url && <a href={selectedResource.url} target="_blank" rel="noreferrer" className="mt-5 inline-block font-bold text-violet-600">Ampliar recurso ↗</a>}</article>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <button key={resource.id} onClick={() => setSelectedResource(resource)} className={`${cardClass} text-left transition hover:-translate-y-1 hover:shadow-md`}><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">{resource.category}</span><h3 className="mt-3 text-lg font-extrabold">{resource.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{resource.description}</p><p className="mt-4 text-xs font-bold text-violet-600">Nivel: {resource.level} · Leer recurso →</p></button>)}</div>{resources.length === 0 && <div className={cardClass}><p className="text-sm text-slate-500">No hay recursos cargados. Ejecuta el archivo SQL incluido en la entrega.</p></div>}</section>}

            {tab === "desafios" && <section className="space-y-5"><div className={cardClass}><h2 className="text-xl font-extrabold">Desafíos y juegos 🎮</h2><p className="mt-1 text-sm text-slate-500">Pon a prueba tus conocimientos y registra tus resultados.</p><p className="mt-3 text-xs font-bold text-violet-700">Intentos completados: {attempts.length}</p></div>{selectedChallenge ? <form onSubmit={submitChallenge} className={cardClass}><button type="button" onClick={() => { setSelectedChallenge(null); setAnswers({}); }} className="mb-4 text-xs font-bold text-violet-600">← Volver a desafíos</button><h2 className="text-xl font-black">{selectedChallenge.title}</h2><p className="mt-1 text-sm text-slate-500">{selectedChallenge.description}</p>{selectedChallenge.questions.map((q, index) => <div key={index} className="mt-6 border-t border-slate-100 pt-4"><p className="font-bold">{index + 1}. {q.question}</p><div className="mt-3 space-y-2">{q.options.map((option, optionIndex) => <label key={optionIndex} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${answers[index] === optionIndex ? "border-violet-400 bg-violet-50" : "border-slate-100"}`}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((prev) => ({ ...prev, [index]: optionIndex }))} required/>{option}</label>)}</div></div>)}<button className={`${buttonClass} mt-6`}>Finalizar desafío</button></form> : <div className="grid gap-4 md:grid-cols-2">{challenges.map((challenge) => <article key={challenge.id} className={cardClass}><span className="text-xs font-bold text-violet-600">{challenge.category} · {challenge.difficulty}</span><h3 className="mt-2 text-lg font-extrabold">{challenge.title}</h3><p className="mt-2 text-sm text-slate-500">{challenge.description}</p><p className="mt-3 text-xs text-slate-400">{challenge.questions?.length ?? 0} preguntas</p><button onClick={() => { setSelectedChallenge(challenge); setAnswers({}); }} className={`${buttonClass} mt-4`}>Comenzar desafío →</button></article>)}</div>}{challenges.length === 0 && !selectedChallenge && <div className={cardClass}><p className="text-sm text-slate-500">No hay desafíos disponibles todavía.</p></div>}</section>}

            {tab === "mensajes" && <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className={`${cardClass} space-y-4`}><h2 className="font-extrabold">Conversaciones</h2><form onSubmit={startConversation} className="space-y-2"><select className={inputClass} value={newMessageUser} onChange={(e) => setNewMessageUser(e.target.value)}><option value="">Iniciar conversación con...</option>{people.map((person) => <option key={person.id} value={person.id}>{person.first_name} {person.last_name}</option>)}</select><button className={`${buttonClass} w-full`} disabled={busy || !newMessageUser}>Nuevo mensaje</button></form><div className="space-y-1">{conversations.map((conversation) => { const member = members.find((m) => m.conversation_id === conversation.id && m.user_id !== userId); const person = people.find((p) => p.id === member?.user_id); return <button key={conversation.id} onClick={() => setSelectedConversation(conversation.id)} className={`w-full rounded-xl p-3 text-left text-sm ${selectedConversation === conversation.id ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50"}`}><span className="block font-bold">{person ? `${person.first_name} ${person.last_name}` : "Conversación"}</span><span className="text-xs text-slate-400">Abrir chat</span></button>; })}{conversations.length === 0 && <p className="text-xs text-slate-400">Todavía no tienes conversaciones.</p>}</div></aside><div className={`${cardClass} flex min-h-[480px] flex-col`}><div className="border-b border-slate-100 pb-3"><h3 className="font-extrabold">{otherPerson ? `${otherPerson.first_name} ${otherPerson.last_name}` : "Mensajes"}</h3><p className="text-xs text-slate-400">Conversación privada</p></div><div className="flex-1 space-y-3 overflow-y-auto py-4">{activeMessages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === userId ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}><p>{message.body}</p><p className={`mt-1 text-[10px] ${message.sender_id === userId ? "text-white/70" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleString()}</p></div></div>)}{activeMessages.length === 0 && <p className="pt-12 text-center text-sm text-slate-400">Selecciona una conversación o inicia una nueva.</p>}</div><form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 pt-3"><input className={inputClass} value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Escribe tu mensaje..." maxLength={2000} disabled={!selectedConversation}/><button className={buttonClass} disabled={!selectedConversation || !messageDraft.trim()}>Enviar</button></form></div></section>}

            {tab === "notificaciones" && <section className={cardClass}><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-extrabold">Notificaciones 🔔</h2><p className="mt-1 text-sm text-slate-500">Actividad relacionada con tu cuenta.</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">{unreadCount} sin leer</span></div><div className="space-y-2">{notifications.map((notification) => <article key={notification.id} className={`rounded-xl border p-4 ${notification.read_at ? "border-slate-100 bg-white" : "border-violet-100 bg-violet-50/50"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{notification.title}</h3><p className="mt-1 text-sm text-slate-500">{notification.body}</p><p className="mt-2 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</p></div>{!notification.read_at && <button onClick={() => markNotificationRead(notification.id)} className="shrink-0 text-xs font-bold text-violet-700">Marcar leída</button>}</div></article>)}{notifications.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No tienes notificaciones todavía.</p>}</div></section>}

            {tab === "perfil" && <section className={cardClass}><div className="mb-5"><h2 className="text-xl font-extrabold">Editar mi perfil 👤</h2><p className="mt-1 text-sm text-slate-500">Mantén actualizada tu información personal.</p></div><div className="mb-6 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-xl font-black text-violet-700">{profileForm.avatar_url ? <img src={profileForm.avatar_url} alt="Avatar" className="h-full w-full object-cover"/> : initials}</div><div><p className="font-bold">{displayName}</p><p className="text-sm text-slate-400">{email} · {roleNames[role] ?? "Miembro"}</p></div></div><form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Nombres<input className={`${inputClass} mt-2`} value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} required maxLength={100}/></label><label className="text-sm font-semibold">Apellidos<input className={`${inputClass} mt-2`} value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} required maxLength={100}/></label><label className="text-sm font-semibold">Carrera<input className={`${inputClass} mt-2`} value={profileForm.career} onChange={(e) => setProfileForm({ ...profileForm, career: e.target.value })} maxLength={150}/></label><label className="text-sm font-semibold">Universidad o institución<input className={`${inputClass} mt-2`} value={profileForm.university_name} onChange={(e) => setProfileForm({ ...profileForm, university_name: e.target.value })} maxLength={150}/></label><label className="text-sm font-semibold md:col-span-2">URL de foto de perfil<input className={`${inputClass} mt-2`} value={profileForm.avatar_url} onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })} placeholder="https://..."/></label><label className="text-sm font-semibold md:col-span-2">Sobre mí<textarea className={`${inputClass} mt-2`} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={4} maxLength={300}/></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm md:col-span-2"><input type="checkbox" checked={profileForm.show_role} onChange={(e) => setProfileForm({ ...profileForm, show_role: e.target.checked })}/>Mostrar mi rol públicamente</label><div className="md:col-span-2"><button className={buttonClass} disabled={busy}>Guardar cambios →</button></div></form></section>}
          </div>
          <footer className="border-t border-slate-100 bg-white px-5 py-6 text-center text-xs text-slate-400">© 2026 AulaViva · Aprende · Comparte · Crece 💜</footer>
        </section>
      </div>
    </main>
  );
}
