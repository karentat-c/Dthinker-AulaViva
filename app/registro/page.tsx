"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "estudiante" | "profesor" | "externo";
type Mode = "registro" | "login";

const countries = [
  { code: "ec", name: "Ecuador" },
  { code: "co", name: "Colombia" },
  { code: "pe", name: "Perú" },
  { code: "mx", name: "México" },
  { code: "ar", name: "Argentina" },
  { code: "cl", name: "Chile" },
  { code: "br", name: "Brasil" },
  { code: "us", name: "Estados Unidos" },
  { code: "es", name: "España" },
  { code: "fr", name: "Francia" },
  { code: "de", name: "Alemania" },
  { code: "it", name: "Italia" },
  { code: "jp", name: "Japón" },
  { code: "kr", name: "Corea del Sur" },
];

const inputStyle =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#202747] outline-none transition placeholder:text-gray-400 focus:border-[#8067E9] focus:ring-4 focus:ring-purple-100";

const roles: {
  id: Role;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "estudiante",
    title: "Estudiante",
    description: "Quiero aprender y compartir proyectos.",
    icon: "🎓",
  },
  {
    id: "profesor",
    title: "Profesor",
    description: "Quiero enseñar y crear grupos académicos.",
    icon: "👨‍🏫",
  },
  {
    id: "externo",
    title: "Externo",
    description: "Quiero explorar y conectar con la comunidad.",
    icon: "🌎",
  },
];

export default function Registro() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("registro");
  const [role, setRole] = useState<Role>("estudiante");
  const [country, setCountry] = useState("ec");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    career: "",
    institution: "",
    publicRole: true,
    acceptedTerms: false,
  });

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<
    "error" | "success" | "info"
  >("info");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [language, setLanguage] = useState("es");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLanguage(params.get("lang") || "es");
  }, []);

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setNotice("");
  }

  function showMessage(
    message: string,
    type: "error" | "success" | "info"
  ) {
    setNotice(message);
    setNoticeType(type);
  }

  // ==========================================
  // REGISTRO E INICIO DE SESIÓN CON SUPABASE
  // ==========================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setNotice("");

    // VALIDACIONES DEL REGISTRO

    if (mode === "registro") {
      if (form.password.length < 8) {
        showMessage(
          "Tu contraseña debe tener al menos 8 caracteres.",
          "error"
        );
        return;
      }

      if (form.password !== form.confirmPassword) {
        showMessage(
          "Las contraseñas no coinciden. Inténtalo nuevamente.",
          "error"
        );
        return;
      }

      if (!form.career.trim()) {
        showMessage(
          "Por favor, indica tu carrera, título o área de interés.",
          "error"
        );
        return;
      }

      if (role !== "externo" && !form.institution.trim()) {
        showMessage(
          "Indica tu universidad o institución educativa.",
          "error"
        );
        return;
      }

      if (!form.acceptedTerms) {
        showMessage(
          "Debes aceptar los términos y condiciones para continuar.",
          "error"
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // ========================================
      // INICIAR SESIÓN
      // ========================================

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) throw error;

        // La sesión se creó correctamente en Supabase.
        // Enviamos al usuario al dashboard protegido.
        router.replace("/dashboard");
        router.refresh();

        return;
      }

      // ========================================
      // REGISTRAR USUARIO
      // ========================================

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,

        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            career: form.career.trim(),

            university_name:
              role === "externo"
                ? null
                : form.institution.trim(),

            country: selectedCountry?.name ?? country,

            role:
              role === "estudiante"
                ? "student"
                : role === "profesor"
                  ? "professor"
                  : "external",

            show_role: form.publicRole,

            preferred_language: language || "es",
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error(
          "Supabase no devolvió los datos del usuario. Inténtalo nuevamente."
        );
      }

      if (data.session) {
        // Si Supabase inicia la sesión automáticamente al registrarse,
        // llevamos al usuario al dashboard.
        router.replace("/dashboard");
        router.refresh();
      } else {
        // Si la confirmación por correo está activada, debe confirmar
        // su cuenta antes de poder entrar al dashboard.
        showMessage(
          "¡Registro casi listo! Revisa tu correo electrónico para confirmar tu cuenta.",
          "success"
        );
      }

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al procesar tu solicitud.";

      showMessage(message, "error");

    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // ACCESO CON GOOGLE Y MICROSOFT
  // ==========================================

  function socialLogin(provider: string) {
    showMessage(
      `El acceso con ${provider} se habilitará cuando configuremos la autenticación.`,
      "info"
    );
  }

  const selectedCountry = countries.find(
    (item) => item.code === country
  );

  return (
    <main className="min-h-screen bg-[#F8F8FD] px-5 py-8 text-[#202747]">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <header className="mb-10 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7964E9] to-[#A48BF5] text-2xl font-black text-white shadow-lg shadow-purple-200">
              A
            </div>

            <div>
              <h1 className="text-2xl font-black">
                Aula<span className="text-[#8067E9]">Viva</span>
              </h1>

              <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-400">
                APRENDE · COMPARTE · CRECE
              </p>
            </div>
          </a>

          <a
            href="/"
            className="rounded-full border border-purple-100 bg-white px-5 py-2 text-sm font-semibold text-[#8067E9] transition hover:bg-purple-50"
          >
            ← Volver al inicio
          </a>
        </header>

        <section className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">

          {/* PANEL IZQUIERDO */}

          <div className="pt-6 lg:sticky lg:top-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-2 text-sm font-bold text-[#8067E9]">
              <span className="h-2 w-2 rounded-full bg-[#43C9A6]" />
              TU FUTURO COMIENZA AQUÍ
            </div>

            <h2 className="text-5xl font-black leading-tight tracking-tight">
              Cada idea
              <br />
              merece un
              <br />
              <span className="bg-gradient-to-r from-[#8067E9] to-[#39BFA1] bg-clip-text text-transparent">
                lugar para crecer.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-lg leading-8 text-gray-500">
              Crea tu espacio en AulaViva y descubre una
              comunidad donde tus conocimientos, proyectos
              e ideas pueden llegar mucho más lejos.
            </p>

            <div className="mt-10 space-y-5">
              {[
                {
                  icon: "🚀",
                  title: "Comparte tus proyectos",
                  desc: "Muestra lo que has creado y conecta con otros.",
                },
                {
                  icon: "🧠",
                  title: "Aprende inteligencia artificial",
                  desc: "Descubre nuevos conocimientos a tu ritmo.",
                },
                {
                  icon: "🎮",
                  title: "Aprende jugando",
                  desc: "Participa en desafíos y juegos educativos.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    {item.icon}
                  </div>

                  <div>
                    <h3 className="font-bold">{item.title}</h3>

                    <p className="text-sm text-gray-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-purple-100 bg-white p-5">
              <p className="text-sm font-semibold text-[#8067E9]">
                ✦ Nuestra comunidad
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                No importa en qué etapa de tu camino académico
                estés. Aquí siempre hay algo nuevo por aprender
                y alguien con quien compartirlo.
              </p>
            </div>
          </div>

          {/* FORMULARIO */}

          <div className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_20px_70px_rgba(75,65,140,0.09)] sm:p-9">

            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEEAFE] text-2xl">
                {mode === "registro" ? "✨" : "👋"}
              </div>

              <h2 className="text-3xl font-black">
                {mode === "registro"
                  ? "Crea tu cuenta"
                  : "¡Qué bueno verte!"}
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                {mode === "registro"
                  ? "Completa tus datos para formar parte de AulaViva."
                  : "Ingresa tus datos para continuar aprendiendo."}
              </p>
            </div>

            {/* CAMBIO DE MODO */}

            <div className="mb-8 grid grid-cols-2 rounded-xl bg-[#F5F4FA] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("registro");
                  setNotice("");
                }}
                className={`rounded-lg py-3 text-sm font-bold transition ${
                  mode === "registro"
                    ? "bg-white text-[#8067E9] shadow-sm"
                    : "text-gray-400"
                }`}
              >
                Crear cuenta
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setNotice("");
                }}
                className={`rounded-lg py-3 text-sm font-bold transition ${
                  mode === "login"
                    ? "bg-white text-[#8067E9] shadow-sm"
                    : "text-gray-400"
                }`}
              >
                Iniciar sesión
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {mode === "registro" && (
                <>
                  {/* NOMBRES */}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Nombres *
                      </label>

                      <input
                        className={inputStyle}
                        placeholder="Tus nombres"
                        value={form.firstName}
                        onChange={(e) =>
                          updateField("firstName", e.target.value)
                        }
                        required
                        maxLength={60}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Apellidos *
                      </label>

                      <input
                        className={inputStyle}
                        placeholder="Tus apellidos"
                        value={form.lastName}
                        onChange={(e) =>
                          updateField("lastName", e.target.value)
                        }
                        required
                        maxLength={60}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* CORREO */}

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Correo electrónico *
                </label>

                <input
                  type="email"
                  className={inputStyle}
                  placeholder="nombre@correo.com"
                  value={form.email}
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                  required
                  autoComplete="email"
                />
              </div>

              {/* CONTRASEÑA */}

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Contraseña *
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${inputStyle} pr-20`}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={(e) =>
                      updateField("password", e.target.value)
                    }
                    required
                    minLength={8}
                    autoComplete={
                      mode === "registro"
                        ? "new-password"
                        : "current-password"
                    }
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8067E9]"
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {mode === "registro" && (
                <>
                  {/* CONFIRMAR CONTRASEÑA */}

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Confirmar contraseña *
                    </label>

                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        className={`${inputStyle} pr-20`}
                        placeholder="Repite tu contraseña"
                        value={form.confirmPassword}
                        onChange={(e) =>
                          updateField(
                            "confirmPassword",
                            e.target.value
                          )
                        }
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8067E9]"
                      >
                        {showConfirm ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </div>

                  {/* PAÍS */}

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      País de residencia *
                    </label>

                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                        <img
                          src={`https://flagcdn.com/w40/${country}.png`}
                          alt={`Bandera de ${selectedCountry?.name || ""}`}
                          width="28"
                          height="20"
                        />
                      </div>

                      <select
                        className={inputStyle}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        {countries.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CARRERA */}

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Carrera, título o área de interés *
                    </label>

                    <input
                      className={inputStyle}
                      placeholder="Ej. Ingeniería en Computación"
                      value={form.career}
                      onChange={(e) =>
                        updateField("career", e.target.value)
                      }
                      required
                      maxLength={120}
                    />
                  </div>

                  {/* INSTITUCIÓN */}

                  {role !== "externo" && (
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Universidad o institución *
                      </label>

                      <input
                        className={inputStyle}
                        placeholder="Nombre de tu universidad"
                        value={form.institution}
                        onChange={(e) =>
                          updateField("institution", e.target.value)
                        }
                        required
                        maxLength={120}
                      />
                    </div>
                  )}

                  {/* ROL */}

                  <div>
                    <label className="mb-3 block text-sm font-bold">
                      ¿Cuál es tu rol en AulaViva? *
                    </label>

                    <div className="space-y-3">
                      {roles.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setRole(item.id);
                            setNotice("");
                          }}
                          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                            role === item.id
                              ? "border-[#8067E9] bg-[#F2EFFF] shadow-sm"
                              : "border-gray-100 bg-white hover:border-purple-200"
                          }`}
                        >
                          <span className="text-3xl">
                            {item.icon}
                          </span>

                          <span className="flex-1">
                            <span className="block font-bold">
                              {item.title}
                            </span>

                            <span className="mt-1 block text-xs text-gray-400">
                              {item.description}
                            </span>
                          </span>

                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                              role === item.id
                                ? "border-[#8067E9] bg-[#8067E9] text-white"
                                : "border-gray-300"
                            }`}
                          >
                            {role === item.id ? "✓" : ""}
                          </span>
                        </button>
                      ))}
                    </div>

                    {role === "externo" && (
                      <p className="mt-3 rounded-xl bg-[#E8F8F2] p-3 text-xs leading-5 text-[#278D70]">
                        Como usuario externo, podrás explorar
                        comunidades públicas y solicitar acceso
                        a aquellas que lo permitan. No asignaremos
                        una comunidad durante el registro.
                      </p>
                    )}
                  </div>

                  {/* VISIBILIDAD DEL ROL */}

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F8F7FC] p-4">
                    <input
                      type="checkbox"
                      checked={form.publicRole}
                      onChange={(e) =>
                        updateField("publicRole", e.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-[#8067E9]"
                    />

                    <span>
                      <span className="block text-sm font-bold">
                        Mostrar mi rol públicamente
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-gray-400">
                        Permitir que otros usuarios vean si soy
                        estudiante, profesor o externo. Puedes
                        cambiar esta preferencia posteriormente.
                      </span>
                    </span>
                  </label>

                  {/* TÉRMINOS */}

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.acceptedTerms}
                      onChange={(e) =>
                        updateField("acceptedTerms", e.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-[#8067E9]"
                      required
                    />

                    <span className="text-xs leading-5 text-gray-500">
                      He leído y acepto los términos y condiciones
                      y la política de privacidad de AulaViva.
                    </span>
                  </label>
                </>
              )}

              {/* MENSAJES */}

              {notice && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-xl p-4 text-sm leading-6 ${
                    noticeType === "error"
                      ? "bg-red-50 text-red-700"
                      : noticeType === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {notice}
                </div>
              )}

              {/* BOTÓN PRINCIPAL */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-[#8067E9] to-[#987CEB] py-4 font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Procesando..."
                  : mode === "registro"
                    ? "Continuar con el registro →"
                    : "Iniciar sesión →"}
              </button>
            </form>

            {/* SEPARADOR */}

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-100" />

              <span className="text-xs text-gray-400">
                O continúa con
              </span>

              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {/* GOOGLE Y MICROSOFT */}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => socialLogin("Google")}
                className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
              >
                <span className="font-black text-lg text-[#4285F4]">
                  G
                </span>

                Google
              </button>

              <button
                type="button"
                onClick={() => socialLogin("Microsoft 365")}
                className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
              >
                <span className="font-black text-lg text-[#2676D2]">
                  ⊞
                </span>

                Microsoft 365
              </button>
            </div>

            <p className="mt-7 text-center text-xs leading-6 text-gray-400">
              Al formar parte de AulaViva, te unes a una comunidad
              que aprende, comparte y crece.
              <br />

              <span className="font-bold text-[#8067E9]">
                ¡Nos alegra tenerte aquí! 💜
              </span>
            </p>

          </div>
        </section>

        <footer className="mt-12 border-t border-gray-100 py-6 text-center text-xs text-gray-400">
          © 2026 AulaViva · Aprende · Comparte · Crece
        </footer>
      </div>
    </main>
  );
}