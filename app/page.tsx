
"use client";

import { useState } from "react";

const languages = [
  { code: "es", name: "Español", flag: "🇪🇨", region: "América Latina" },
  { code: "en", name: "English", flag: "🇺🇸", region: "English" },
  { code: "pt", name: "Português", flag: "🇧🇷", region: "Brasil" },
  { code: "fr", name: "Français", flag: "🇫🇷", region: "France" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", region: "Deutschland" },
  { code: "it", name: "Italiano", flag: "🇮🇹", region: "Italia" },
  { code: "ja", name: "日本語", flag: "🇯🇵", region: "日本" },
  { code: "ko", name: "한국어", flag: "🇰🇷", region: "대한민국" },
];

export default function Home() {
  const [selected, setSelected] = useState("es");
  const [step, setStep] = useState("language");

  const language = languages.find(
    (item) => item.code === selected
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#F8F8FD] text-[#202747]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7964E9] to-[#A48BF5] text-2xl font-black text-white shadow-lg shadow-purple-200">
            A
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Aula<span className="text-[#8067E9]">Viva</span>
            </h1>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-400">
              APRENDE · COMPARTE · CRECE
            </p>
          </div>
        </div>

        <div className="hidden rounded-full border border-purple-100 bg-white px-4 py-2 text-sm font-medium text-gray-500 sm:block">
          ✦ Una comunidad para crecer juntos
        </div>
      </header>

      <section className="mx-auto grid min-h-[75vh] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-2 text-sm font-semibold text-[#8067E9] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#43C9A6]" />
            TU ESPACIO PARA APRENDER Y CREAR
          </div>

          {step === "language" ? (
            <>
              <div className="space-y-4">
                <h2 className="text-5xl font-black leading-[1.12] tracking-tight sm:text-6xl">
                  El conocimiento
                  <br />
                  crece cuando
                  <br />
                  <span className="bg-gradient-to-r from-[#8067E9] to-[#39BFA1] bg-clip-text text-transparent">
                    lo compartimos.
                  </span>
                </h2>

                <p className="max-w-lg text-lg leading-8 text-gray-500">
                  Descubre proyectos, aprende sobre inteligencia
                  artificial, juega y conecta con estudiantes de
                  todo el mundo. ¡Tu próxima gran idea comienza aquí!
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-500">
                <span className="rounded-full bg-[#EEEAFE] px-4 py-2 text-[#7964E9]">
                  ✦ Comunidad
                </span>
                <span className="rounded-full bg-[#E2F8F1] px-4 py-2 text-[#219C7C]">
                  ✦ Aprendizaje
                </span>
                <span className="rounded-full bg-[#FFF0ED] px-4 py-2 text-[#E77B6C]">
                  ✦ Creatividad
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <h2 className="text-5xl font-black leading-tight">
                  ¡Bienvenido a
                  <br />
                  <span className="text-[#8067E9]">AulaViva!</span>
                </h2>
                <p className="max-w-lg text-lg leading-8 text-gray-500">
                  Has seleccionado {language?.flag} {language?.name}.
                  Aquí tus ideas pueden convertirse en proyectos,
                  tus preguntas en conocimiento y tus conexiones
                  en grandes oportunidades.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-200/40 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />

          <div className="relative rounded-[2rem] border border-white bg-white p-7 shadow-[0_25px_80px_rgba(75,65,140,0.10)] sm:p-10">
            {step === "language" ? (
              <>
                <div className="mb-8">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEEAFE] text-2xl">
                    🌎
                  </div>
                  <h3 className="text-2xl font-bold">
                    ¡Comencemos!
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Selecciona el idioma en el que deseas
                    disfrutar tu experiencia en AulaViva.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => setSelected(item.code)}
                      className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-1 ${
                        selected === item.code
                          ? "border-[#8067E9] bg-[#F1EEFF] shadow-md shadow-purple-100"
                          : "border-gray-100 bg-white hover:border-purple-200 hover:bg-purple-50/50"
                      }`}
                    >
                      <span className="text-2xl">
                        {item.flag}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                          {item.name}
                        </span>
                        <span className="block truncate text-[10px] text-gray-400">
                          {item.region}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                          selected === item.code
                            ? "border-[#8067E9] bg-[#8067E9] text-white"
                            : "border-gray-200"
                        }`}
                      >
                        {selected === item.code ? "✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep("welcome")}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#8067E9] to-[#987CEB] py-4 font-bold text-white shadow-lg shadow-purple-200 transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  Continuar
                  <span>→</span>
                </button>

                <p className="mt-5 text-center text-xs text-gray-400">
                  Tu experiencia comienza con una elección.
                </p>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#EEEAFE] to-[#DDF8EF] text-5xl">
                  🎓
                </div>

                <h3 className="text-2xl font-black">
                  Un mundo de posibilidades
                </h3>

                <p className="mt-4 leading-7 text-gray-500">
                  Forma parte de una comunidad donde compartir
                  tus proyectos, aprender y descubrir nuevas ideas
                  es parte de cada día.
                </p>

                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => (window.location.href = `/registro?lang=${selected}`)}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#8067E9] to-[#987CEB] py-4 font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-1"
                  >
                    ¡Quiero formar parte! →
                  </button>

                  <button
                    onClick={() => setStep("language")}
                    className="w-full rounded-2xl border border-gray-200 py-3 font-semibold text-gray-500 transition hover:bg-gray-50"
                  >
                    ← Cambiar idioma
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-6 text-xs text-gray-400 sm:flex-row">
        <p>© 2026 AulaViva. Una comunidad de crecimiento.</p>
        <p>Hecho para aprender, compartir e inspirar. 💜</p>
      </footer>
    </main>
  );
}
