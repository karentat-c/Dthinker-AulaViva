
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  career: string | null;
  university_name: string | null;
  role: string | null;
  show_role: boolean | null;
  bio: string | null;
};

type Community = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

type CommunityInvite = {
  community_id: string;
  code: string;
};

const navigation = [
  { icon: "🏠", label: "Dashboard", href: "#inicio" },
  { icon: "👥", label: "Comunidades", href: "#comunidades" },
  { icon: "🚀", label: "Proyectos", href: "#proyectos" },
  { icon: "🧠", label: "Aprendizaje IA", href: "#aprendizaje" },
  { icon: "🎮", label: "Desafíos", href: "#desafios" },
  { icon: "👤", label: "Mi perfil", href: "#editar-perfil" },
];

const shortcuts = [
  {
    icon: "👥",
    title: "Comunidades",
    description: "Conecta con personas que comparten tus intereses.",
    href: "#comunidades",
    color: "bg-purple-100",
  },
  {
    icon: "🚀",
    title: "Proyectos",
    description: "Comparte tus ideas y descubre nuevos proyectos.",
    href: "#proyectos",
    color: "bg-blue-100",
  },
  {
    icon: "🧠",
    title: "Inteligencia artificial",
    description: "Aprende nuevas habilidades con IA.",
    href: "#aprendizaje",
    color: "bg-pink-100",
  },
  {
    icon: "🎮",
    title: "Aprende jugando",
    description: "Participa en actividades y desafíos educativos.",
    href: "#desafios",
    color: "bg-orange-100",
  },
];

const roleLabels: Record<string, string> = {
  student: "Estudiante",
  professor: "Profesor",
  external: "Externo",
};

const errorMessages: Record<string, string> = {
  campos: "Debes completar tus nombres y apellidos.",
  guardar: "No se pudieron guardar los cambios.",
  sin_permiso: "No tienes permisos para realizar esta acción.",
  nombre: "Debes ingresar el nombre de la comunidad.",
  crear_comunidad: "No se pudo crear la comunidad. Inténtalo nuevamente.",
  codigo: "Debes ingresar un código de invitación.",
  codigo_invalido: "El código no es válido o no se pudo ingresar a la comunidad.",
  solo_estudiantes: "Solamente los estudiantes pueden unirse mediante un código.",
  rol_no_configurado: "No pudimos identificar tu rol. Revisa tu perfil.",
};
export const instant = false;
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    perfil?: string;
    error?: string;
    comunidad?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // ==========================================
  // 1. VERIFICAR SESIÓN
  // ==========================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/registro");
  }

  // ==========================================
  // 2. OBTENER PERFIL
  // ==========================================

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, career, university_name, role, show_role, bio"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as Profile | null;
  const metadata = user.user_metadata ?? {};

  const firstName =
    profile?.first_name ||
    (typeof metadata.first_name === "string"
      ? metadata.first_name
      : "") ||
    user.email?.split("@")[0] ||
    "Usuario";

  const lastName =
    profile?.last_name ||
    (typeof metadata.last_name === "string"
      ? metadata.last_name
      : "");

  const fullName = `${firstName} ${lastName}`.trim();

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const role = profile?.role || "";

  const roleLabel = roleLabels[role] || "Miembro";

  const career = profile?.career || "Carrera no registrada";

  const university =
    profile?.university_name || "Institución no registrada";

  // ==========================================
  // 3. OBTENER COMUNIDADES DEL USUARIO
  // ==========================================

  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", user.id);

  const communityIds = [
    ...new Set(
      (memberships ?? [])
        .map((membership) => membership.community_id)
        .filter(Boolean)
    ),
  ];

  let communities: Community[] = [];

  if (communityIds.length > 0) {
    const { data: communityData, error: communityError } =
      await supabase
        .from("communities")
        .select(
          "id, name, description, created_by, created_at"
        )
        .in("id", communityIds)
        .order("created_at", { ascending: false });

    if (communityError) {
      console.error(
        "Error al obtener comunidades:",
        communityError
      );
    } else {
      communities = (communityData ?? []) as Community[];
    }
  }

  // ==========================================
  // 4. OBTENER CÓDIGOS DE INVITACIÓN
  // SOLO PARA COMUNIDADES CREADAS POR PROFESORES
  // ==========================================

  let inviteCodes: Record<string, string> = {};

  if (role === "professor") {
    const ownedCommunityIds = communities
      .filter((community) => community.created_by === user.id)
      .map((community) => community.id);

    if (ownedCommunityIds.length > 0) {
      const { data: inviteData, error: inviteError } =
        await supabase
          .from("community_invites")
          .select("community_id, code")
          .in("community_id", ownedCommunityIds);

      if (inviteError) {
        console.error(
          "Error al obtener códigos:",
          inviteError
        );
      } else {
        (inviteData as CommunityInvite[] | null)?.forEach(
          (invite) => {
            inviteCodes[invite.community_id] = invite.code;
          }
        );
      }
    }
  }

  // ==========================================
  // 5. CERRAR SESIÓN
  // ==========================================

  async function cerrarSesion() {
    "use server";

    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect("/registro");
  }

  // ==========================================
  // 6. CREAR COMUNIDAD
  // SOLAMENTE PROFESORES
  // ==========================================

  async function crearComunidad(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/registro");
    }

    // Verificar el rol directamente en Supabase.

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "professor") {
      redirect("/dashboard?error=sin_permiso#comunidades");
    }

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    const description = String(
      formData.get("description") ?? ""
    ).trim();

    if (!name) {
      redirect("/dashboard?error=nombre#comunidades");
    }

    // Insertar la comunidad.
    // El trigger de Supabase agrega al profesor
    // como miembro y genera el código de invitación.

    const { data: community, error } = await supabase
      .from("communities")
      .insert({
        name,
        description: description || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !community) {
      console.error(
        "Error al crear comunidad:",
        error
      );

      redirect(
        "/dashboard?error=crear_comunidad#comunidades"
      );
    }

    revalidatePath("/dashboard");

    redirect("/dashboard?comunidad=creada#comunidades");
  }

  // ==========================================
  // 7. UNIRSE A COMUNIDAD MEDIANTE CÓDIGO
  // SOLAMENTE ESTUDIANTES
  // ==========================================

  async function unirseAComunidad(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/registro");
    }

    // Comprobar el rol.

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "student") {
      redirect("/dashboard?error=solo_estudiantes#comunidades");
    }

    const code = String(
      formData.get("code") ?? ""
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!code) {
      redirect("/dashboard?error=codigo#comunidades");
    }

    // Ejecutar la función RPC creada en Supabase.

    const { error } = await supabase.rpc(
      "join_community_by_code",
      {
        p_code: code,
      }
    );

    if (error) {
      console.error(
        "Error al unirse a comunidad:",
        error
      );

      redirect(
        "/dashboard?error=codigo_invalido#comunidades"
      );
    }

    revalidatePath("/dashboard");

    redirect("/dashboard?comunidad=unida#comunidades");
  }

  // ==========================================
  // 8. ACTUALIZAR PERFIL
  // ==========================================

  async function actualizarPerfil(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/registro");
    }

    const first_name = String(
      formData.get("first_name") ?? ""
    ).trim();

    const last_name = String(
      formData.get("last_name") ?? ""
    ).trim();

    const career = String(
      formData.get("career") ?? ""
    ).trim();

    const university_name = String(
      formData.get("university_name") ?? ""
    ).trim();

    const bio = String(
      formData.get("bio") ?? ""
    ).trim();

    const show_role =
      formData.get("show_role") === "on";

    if (!first_name || !last_name) {
      redirect("/dashboard?error=campos#editar-perfil");
    }

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update({
        first_name,
        last_name,
        career: career || null,
        university_name: university_name || null,
        bio: bio || null,
        show_role,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !updatedProfile) {
      console.error(
        "Error al actualizar perfil:",
        error
      );

      redirect("/dashboard?error=guardar#editar-perfil");
    }

    revalidatePath("/dashboard");

    redirect("/dashboard?perfil=actualizado#editar-perfil");
  }

  // ==========================================
  // 9. INTERFAZ DEL DASHBOARD
  // ==========================================

  return (
    <main className="min-h-screen bg-[#F5F6FC] text-[#202747]">
      <div className="flex min-h-screen">

        {/* MENÚ LATERAL */}

        <aside className="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-gray-100 bg-white px-5 py-7">

          {/* LOGO */}

          <a href="#inicio" className="mb-12 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9272F0] to-[#7054D9] text-2xl font-black text-white shadow-lg">
              A
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Aula<span className="text-[#8767E9]">Viva</span>
              </h1>

              <p className="text-[9px] font-semibold tracking-[2px] text-gray-400">
                APRENDE · COMPARTE · CRECE
              </p>
            </div>
          </a>

          {/* NAVEGACIÓN */}

          <div className="mb-3 px-3 text-[11px] font-bold tracking-widest text-gray-400">
            MENÚ PRINCIPAL
          </div>

          <nav className="flex flex-col gap-2">
            {navigation.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  index === 0
                    ? "bg-[#F0EBFF] text-[#8060E8]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-[#8060E8]"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          {/* COMUNIDAD */}

          <div className="mt-12 mb-3 px-3 text-[11px] font-bold tracking-widest text-gray-400">
            TU COMUNIDAD
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#F1ECFF] to-[#E8F8F5] p-4">
            <div className="mb-2 text-2xl">✨</div>

            <h3 className="text-sm font-bold">
              ¡Crezcamos juntos!
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Comparte tus conocimientos y descubre nuevas oportunidades.
            </p>

            <a
              href="#comunidades"
              className="mt-3 block text-xs font-bold text-[#8060E8]"
            >
              Explorar comunidad →
            </a>
          </div>

          {/* USUARIO */}

          <div className="mt-auto border-t border-gray-100 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDE7FF] font-bold text-[#8060E8]">
                {initials || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {fullName}
                </p>

                <p className="text-xs text-gray-400">
                  {roleLabel}
                </p>
              </div>
            </div>

            <form action={cerrarSesion}>
              <button
                type="submit"
                className="mt-5 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50"
              >
                ↪ Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}

        <div className="min-w-0 flex-1">

          {/* BARRA SUPERIOR */}

          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-lg lg:px-8">

            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8767E9] font-bold text-white">
                A
              </div>

              <span className="font-extrabold">
                Aula<span className="text-[#8767E9]">Viva</span>
              </span>
            </div>

            <div className="hidden max-w-xl flex-1 md:block">
              <input
                type="search"
                placeholder="Buscar proyectos, comunidades o conocimientos..."
                className="w-full rounded-2xl border border-gray-100 bg-[#F8F8FC] px-5 py-3 text-sm outline-none transition focus:border-[#9879EF] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Mensajes"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F2FF] text-lg"
              >
                ✉️
              </button>

              <button
                type="button"
                aria-label="Notificaciones"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F2FF] text-lg"
              >
                🔔
              </button>

              <div className="flex items-center gap-3 border-l border-gray-100 pl-4">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold">
                    {fullName}
                  </p>

                  <p className="text-xs text-gray-400">
                    {roleLabel}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#A58BF7] to-[#65C9BD] font-bold text-white">
                  {initials || "U"}
                </div>
              </div>
            </div>
          </header>

          {/* PANEL PRINCIPAL */}

          <div className="grid grid-cols-1 gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_310px] xl:p-8">

            {/* COLUMNA CENTRAL */}

            <section className="min-w-0 space-y-7" id="inicio">

              {/* BIENVENIDA */}

              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#7960E5] via-[#8970E9] to-[#52BFB4] p-7 text-white shadow-lg sm:p-9">

                <div className="relative z-10 max-w-xl">
                  <p className="mb-3 text-xs font-bold tracking-widest text-white/80">
                    TU ESPACIO DE APRENDIZAJE
                  </p>

                  <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                    ¡Hola, {firstName}! 👋
                    <br />
                    Nos alegra tenerte aquí.
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-6 text-white/85">
                    Este es tu espacio para aprender, compartir tus
                    proyectos y conectar con personas que tienen
                    grandes ideas.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <a
                      href="#proyectos"
                      className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#7960E5] shadow transition hover:bg-gray-100"
                    >
                      Explorar proyectos →
                    </a>

                    <a
                      href="#comunidades"
                      className="rounded-xl border border-white/50 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      Ver comunidades
                    </a>
                  </div>
                </div>

                <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-white/10" />

                <div className="pointer-events-none absolute -bottom-24 right-32 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              </div>

              {/* ACCESOS RÁPIDOS */}

              <section id="explora">
                <div className="mb-4">
                  <h2 className="text-xl font-extrabold">
                    Explora AulaViva
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Encuentra nuevas formas de aprender y compartir.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {shortcuts.map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${item.color} text-2xl`}
                      >
                        {item.icon}
                      </div>

                      <div>
                        <h3 className="font-bold transition group-hover:text-[#8060E8]">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-gray-400">
                          {item.description}
                        </p>
                      </div>

                      <span className="ml-auto text-gray-300 transition group-hover:text-[#8060E8]">
                        →
                      </span>
                    </a>
                  ))}
                </div>
              </section>

              {/* ================================== */}
              {/* COMUNIDADES */}
              {/* ================================== */}

              <section
                id="comunidades"
                className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Comunidades de AulaViva 👥
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Conecta, aprende y comparte conocimientos.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#F0EBFF] px-3 py-1 text-xs font-bold text-[#8060E8]">
                    {communities.length} comunidades
                  </span>
                </div>

                {/* MENSAJES */}

                {params.comunidad === "creada" && (
                  <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                    ¡Tu comunidad se creó correctamente! Ya puedes compartir su código de invitación.
                  </div>
                )}

                {params.comunidad === "unida" && (
                  <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                    ¡Te has unido correctamente a la comunidad!
                  </div>
                )}

                {params.error && errorMessages[params.error] && (
                  <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                    {errorMessages[params.error]}
                  </div>
                )}

                {/* ---------------------------------- */}
                {/* OPCIONES PARA PROFESORES */}
                {/* ---------------------------------- */}

                {role === "professor" && (
                  <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#F1ECFF] to-[#E8F8F5] p-5">

                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                        🎓
                      </div>

                      <div>
                        <h3 className="font-extrabold">
                          Panel del profesor
                        </h3>

                        <p className="text-xs text-gray-500">
                          Administra tus espacios de aprendizaje.
                        </p>
                      </div>
                    </div>

                    <h4 className="mb-3 font-bold">
                      Crear una nueva comunidad
                    </h4>

                    <form
                      action={crearComunidad}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="community-name"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Nombre de la comunidad *
                        </label>

                        <input
                          id="community-name"
                          name="name"
                          type="text"
                          required
                          maxLength={100}
                          placeholder="Ej. Programación en Java"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="community-description"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Descripción
                        </label>

                        <textarea
                          id="community-description"
                          name="description"
                          rows={3}
                          maxLength={500}
                          placeholder="Describe el propósito de tu comunidad..."
                          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-[#8060E8] to-[#9878EC] px-5 py-3 font-bold text-white shadow-md transition hover:opacity-90"
                      >
                        + Crear comunidad
                      </button>
                    </form>
                  </div>
                )}

                {/* ---------------------------------- */}
                {/* OPCIONES PARA ESTUDIANTES */}
                {/* ---------------------------------- */}

                {role === "student" && (
                  <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#F1ECFF] to-[#E8F8F5] p-5">

                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                        🎓
                      </div>

                      <div>
                        <h3 className="font-extrabold">
                          Únete a una comunidad
                        </h3>

                        <p className="text-xs text-gray-500">
                          Ingresa el código que te proporcionó tu profesor.
                        </p>
                      </div>
                    </div>

                    <form
                      action={unirseAComunidad}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="community-code"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Código de invitación
                        </label>

                        <input
                          id="community-code"
                          name="code"
                          type="text"
                          required
                          maxLength={50}
                          autoComplete="off"
                          placeholder="Ingresa el código de tu profesor"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-[#8767E9]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-[#8060E8] to-[#9878EC] px-5 py-3 font-bold text-white shadow-md transition hover:opacity-90"
                      >
                        Unirme a la comunidad →
                      </button>
                    </form>
                  </div>
                )}

                {/* ---------------------------------- */}
                {/* OPCIONES PARA EXTERNOS */}
                {/* ---------------------------------- */}

                {role === "external" && (
                  <div className="mt-6 rounded-2xl bg-[#F9F8FE] p-5 text-center">
                    <div className="text-3xl">🌎</div>

                    <h3 className="mt-3 font-bold">
                      ¡Explora AulaViva!
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Puedes descubrir el contenido de AulaViva.
                      La creación de comunidades está reservada a
                      profesores y el ingreso mediante código a estudiantes.
                    </p>
                  </div>
                )}

                {/* ---------------------------------- */}
                {/* LISTADO DE COMUNIDADES */}
                {/* ---------------------------------- */}

                <div className="mt-7">
                  <h3 className="mb-4 font-extrabold">
                    Mis comunidades
                  </h3>

                  {communities.length === 0 ? (
                    <div className="rounded-2xl bg-[#F9F8FE] px-5 py-10 text-center">
                      <div className="text-4xl">💡</div>

                      <h4 className="mt-3 font-bold">
                        ¡Aquí comienza tu aprendizaje!
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {role === "professor"
                          ? "Todavía no has creado comunidades. Crea una para comenzar."
                          : role === "student"
                            ? "Todavía no perteneces a ninguna comunidad. Ingresa el código de tu profesor."
                            : "Pronto podrás descubrir nuevas experiencias en AulaViva."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {communities.map((community) => (
                        <article
                          key={community.id}
                          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0EBFF] text-2xl">
                              👥
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="font-extrabold">
                                {community.name}
                              </h4>

                              <p className="mt-1 text-sm leading-5 text-gray-500">
                                {community.description ||
                                  "Comunidad de aprendizaje de AulaViva."}
                              </p>

                              {community.created_by === user.id && (
                                <span className="mt-2 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                  Creada por ti
                                </span>
                              )}
                            </div>
                          </div>

                          {/* CÓDIGO VISIBLE SOLAMENTE PARA EL PROFESOR CREADOR */}

                          {role === "professor" &&
                            community.created_by === user.id && (
                              <div className="mt-5 rounded-xl bg-[#F9F8FE] p-4">
                                <p className="text-xs font-bold text-gray-500">
                                  CÓDIGO DE INVITACIÓN
                                </p>

                                {inviteCodes[community.id] ? (
                                  <div className="mt-2">
                                    <code className="block select-all break-all rounded-lg bg-white p-3 text-lg font-extrabold tracking-widest text-[#8060E8]">
                                      {inviteCodes[community.id]}
                                    </code>

                                    <p className="mt-2 text-xs text-gray-400">
                                      Comparte este código con tus estudiantes
                                      para que puedan ingresar a tu comunidad.
                                    </p>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-sm text-orange-600">
                                    No se pudo cargar el código. Revisa los permisos de lectura de community_invites en Supabase.
                                  </p>
                                )}
                              </div>
                            )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

              </section>

              {/* PROYECTOS */}

              <section
                id="proyectos"
                className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Proyectos de la comunidad 🚀
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Descubre lo que están creando otros usuarios.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#F0EBFF] px-3 py-1 text-xs font-bold text-[#8060E8]">
                    Próximamente
                  </span>
                </div>

                <div className="mt-6 rounded-2xl bg-[#F9F8FE] px-5 py-10 text-center">
                  <div className="text-4xl">💡</div>

                  <h3 className="mt-3 font-bold">
                    ¡Aquí comienzan las grandes ideas!
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                    Estamos preparando este espacio para que puedas
                    publicar proyectos, compartir avances y recibir
                    comentarios de la comunidad.
                  </p>
                </div>
              </section>

              {/* APRENDIZAJE */}

              <section
                id="aprendizaje"
                className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Continúa aprendiendo 📚
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Tu próximo conocimiento está por descubrirse.
                    </p>
                  </div>

                  <span className="text-2xl">🎓</span>
                </div>

                <div className="mt-6 flex flex-col items-center rounded-2xl bg-[#F9F8FE] px-5 py-8 text-center">
                  <div className="text-4xl">🧠</div>

                  <h3 className="mt-3 font-bold">
                    Tu aprendizaje comienza aquí
                  </h3>

                  <p className="mt-2 max-w-md text-sm text-gray-400">
                    Pronto encontrarás lecciones, recursos educativos
                    y actividades para desarrollar nuevas habilidades.
                  </p>
                </div>
              </section>

              {/* DESAFÍOS */}

              <section
                id="desafios"
                className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-extrabold">
                  Desafíos y juegos 🎮
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  Aprende mientras resuelves retos y pones a prueba
                  tus conocimientos.
                </p>

                <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#F1ECFF] to-[#E9F9F5] p-5">
                  <p className="font-bold">
                    ¡Prepárate para jugar y aprender!
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Esta sección estará disponible en una próxima etapa.
                  </p>
                </div>
              </section>

            </section>

            {/* ================================== */}
            {/* PANEL DERECHO */}
            {/* ================================== */}

            <aside className="space-y-6">

              {/* PERFIL */}

              <section
                id="perfil"
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold">
                    Mi perfil
                  </h2>

                  <span className="text-xl">👤</span>
                </div>

                <div className="mt-6 flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#A58BF7] to-[#65C9BD] text-2xl font-extrabold text-white shadow-md">
                    {initials || "U"}
                  </div>

                  <h3 className="mt-3 text-lg font-extrabold">
                    {fullName}
                  </h3>

                  <span className="mt-2 rounded-full bg-[#F0EBFF] px-4 py-1 text-xs font-bold text-[#8060E8]">
                    {roleLabel}
                  </span>

                  <p className="mt-3 text-sm text-gray-400">
                    {user.email}
                  </p>
                </div>

                <div className="mt-6 space-y-4 border-t border-gray-100 pt-5">
                  <div>
                    <p className="text-xs font-semibold text-gray-400">
                      CARRERA
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {career}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400">
                      INSTITUCIÓN
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {university}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400">
                      SOBRE MÍ
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {profile?.bio ||
                        "Aún no has agregado una descripción."}
                    </p>
                  </div>
                </div>

                <a
                  href="#editar-perfil"
                  className="mt-6 block w-full rounded-xl bg-[#8060E8] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#7050D8]"
                >
                  ✏️ Editar mi perfil
                </a>
              </section>

              {/* EDITAR PERFIL */}

              <section
                id="editar-perfil"
                className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Editar mi perfil
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Mantén actualizada tu información personal.
                    </p>
                  </div>

                  <span className="text-2xl">✏️</span>
                </div>

                {/* MENSAJES */}

                {params.perfil === "actualizado" && (
                  <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                    ¡Tu perfil se actualizó correctamente!
                  </div>
                )}

                {params.error === "campos" && (
                  <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                    {errorMessages.campos}
                  </div>
                )}

                {params.error === "guardar" && (
                  <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                    {errorMessages.guardar}
                    Verifica los permisos de Supabase e inténtalo nuevamente.
                  </div>
                )}

                {/* FORMULARIO */}

                <form
                  action={actualizarPerfil}
                  className="mt-6 space-y-4"
                >

                  <div>
                    <label
                      htmlFor="first_name"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Nombres *
                    </label>

                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      maxLength={100}
                      defaultValue={profile?.first_name ?? firstName}
                      placeholder="Tus nombres"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="last_name"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Apellidos *
                    </label>

                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      maxLength={100}
                      defaultValue={profile?.last_name ?? lastName}
                      placeholder="Tus apellidos"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="career"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Carrera
                    </label>

                    <input
                      id="career"
                      name="career"
                      type="text"
                      maxLength={150}
                      defaultValue={profile?.career ?? ""}
                      placeholder="Ej. Ingeniería en Computación"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="university_name"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Institución
                    </label>

                    <input
                      id="university_name"
                      name="university_name"
                      type="text"
                      maxLength={150}
                      defaultValue={profile?.university_name ?? ""}
                      placeholder="Ej. ESPOL"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bio"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Sobre mí
                    </label>

                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      maxLength={300}
                      defaultValue={profile?.bio ?? ""}
                      placeholder="Cuéntanos un poco sobre ti, tus intereses y lo que te apasiona..."
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8767E9]"
                    />

                    <p className="mt-1 text-xs text-gray-400">
                      Máximo 300 caracteres.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F9F8FE] p-4 text-sm">
                    <input
                      type="checkbox"
                      name="show_role"
                      defaultChecked={profile?.show_role ?? false}
                      className="mt-0.5 h-4 w-4 accent-[#8060E8]"
                    />

                    <span>
                      <span className="block font-semibold">
                        Mostrar mi rol públicamente
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-gray-400">
                        Permitir que otros usuarios vean si eres estudiante,
                        profesor o externo.
                      </span>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-[#8060E8] to-[#9878EC] px-5 py-3 font-bold text-white shadow-md transition hover:opacity-90"
                  >
                    Guardar cambios →
                  </button>

                </form>
              </section>

              {/* ACTIVIDAD */}

              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold">
                    Mi actividad
                  </h2>

                  <span className="text-xl">📊</span>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    {
                      icon: "🚀",
                      label: "Proyectos",
                      detail: "En preparación",
                    },
                    {
                      icon: "👥",
                      label: "Comunidades",
                      detail: `${communities.length} activas`,
                    },
                    {
                      icon: "📚",
                      label: "Lecciones",
                      detail: "En preparación",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-[#F9F8FE] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {item.icon}
                        </span>

                        <span className="text-sm font-semibold">
                          {item.label}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-gray-400">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-gray-400">
                  Tus estadísticas se actualizarán a medida que
                  participes en AulaViva.
                </p>
              </section>

              {/* TU COMUNIDAD */}

              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold">
                    Tu comunidad
                  </h2>

                  <span className="text-xl">🌎</span>
                </div>

                <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#F1ECFF] to-[#E8F8F5] p-5 text-center">
                  <div className="text-4xl">🤝</div>

                  <h3 className="mt-3 font-bold">
                    Conecta y comparte
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Encuentra estudiantes, profesores y personas
                    con intereses similares.
                  </p>

                  <a
                    href="#comunidades"
                    className="mt-4 inline-block rounded-xl bg-[#8060E8] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#7050D8]"
                  >
                    Explorar comunidades
                  </a>
                </div>
              </section>

            </aside>
          </div>

          {/* PIE DE PÁGINA */}

          <footer className="border-t border-gray-100 bg-white px-6 py-6 text-center text-xs text-gray-400">
            © 2026 AulaViva · Aprende · Comparte · Crece 💜
          </footer>

        </div>
      </div>
    </main>
  );
}
