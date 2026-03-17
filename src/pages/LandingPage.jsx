import React from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Lock,
  Menu,
  MonitorSmartphone,
  Printer,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

const features = [
  { icon: FileText, title: "Expediente digital", description: "Historial clinico completo con cumplimiento NOM-004." },
  { icon: CalendarDays, title: "Agenda inteligente", description: "Citas online, recordatorios y control de asistencia." },
  { icon: Printer, title: "Recetas medicas", description: "Genera e imprime recetas profesionales en segundos." },
  { icon: MonitorSmartphone, title: "Portal del paciente", description: "Tus pacientes ven sus citas y medicamentos desde su celular." },
  { icon: ClipboardList, title: "CIE-10 integrado", description: "Diagnosticos codificados segun la norma mexicana." },
  { icon: ShieldCheck, title: "Seguro y confidencial", description: "Datos protegidos bajo LFPDPPP 2025." },
];

const testimonials = [
  {
    initials: "CM",
    name: "Dr. Carlos Mendoza",
    specialty: "Medico General",
    text: "Cliniq nos ahorro horas a la semana. El expediente y la agenda ya viven en el mismo lugar y eso se siente desde el primer dia.",
  },
  {
    initials: "LR",
    name: "Dra. Laura Rios",
    specialty: "Medicina Familiar",
    text: "Lo que mas me gusto fue tener notas clinicas ordenadas y recetas presentables sin depender de formatos sueltos.",
  },
  {
    initials: "JP",
    name: "Dr. Jorge Paredes",
    specialty: "Medico Internista",
    text: "El portal del paciente bajo mucho la friccion en seguimiento. Ahora mis pacientes revisan sus medicamentos y citas desde el celular.",
  },
];

const faqs = [
  {
    question: "Cliniq cumple con la NOM-004?",
    answer:
      "Si, Cliniq esta disenado para cumplir con los requisitos de la NOM-004-SSA3-2012 incluyendo historia clinica, notas de evolucion, consentimiento informado y conservacion de expedientes por minimo 5 anos.",
  },
  { question: "Necesito instalar algo?", answer: "No. Cliniq funciona directo desde tu navegador, en computadora, tablet o celular." },
  { question: "Mis datos estan seguros?", answer: "Si. Toda la informacion esta cifrada y protegida bajo la LFPDPPP 2025." },
  { question: "Puedo cancelar cuando quiera?", answer: "Si. No hay contratos ni penalizaciones. Puedes cancelar en cualquier momento." },
  { question: "Tienen soporte tecnico?", answer: "Si. Incluimos soporte por WhatsApp y email sin costo adicional." },
];

function RevealSection({ children, className = "", id }) {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={`${className} transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {children}
    </section>
  );
}

export default function LandingPage({ onNavigate, initialHash = "" }) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = React.useState(0);
  const [loginMenuOpen, setLoginMenuOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [demoForm, setDemoForm] = React.useState({ nombre: "", email: "", telefono: "", especialidad: "" });
  const [demoMessage, setDemoMessage] = React.useState("");
  const [demoError, setDemoError] = React.useState("");
  const [isSubmittingDemo, setIsSubmittingDemo] = React.useState(false);

  const scrollToSection = React.useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
    setLoginMenuOpen(false);
  }, []);

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!initialHash) return;
    const id = initialHash.replace("#", "");
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [initialHash]);

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setDemoMessage("");
    setDemoError("");

    if (!demoForm.nombre.trim() || !demoForm.email.trim()) {
      setDemoError("Nombre y email son obligatorios.");
      return;
    }

    try {
      setIsSubmittingDemo(true);
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: demoForm.nombre.trim(),
          email: demoForm.email.trim(),
          telefono: demoForm.telefono.trim(),
          especialidad: demoForm.especialidad.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No pudimos registrar tu solicitud. Intenta de nuevo.");
      }

      setDemoForm({ nombre: "", email: "", telefono: "", especialidad: "" });
      setDemoMessage("Gracias. Te contactaremos en menos de 24 horas.");
    } catch (error) {
      setDemoError(error.message || "No pudimos registrar tu solicitud. Intenta de nuevo.");
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  const navLinks = [
    { label: "Funcionalidades", id: "features" },
    { label: "Precios", id: "pricing" },
    { label: "FAQ", id: "faq" },
    { label: "Contacto", id: "contact" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/95 shadow-lg shadow-slate-200/60 backdrop-blur border-b border-slate-200" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => onNavigate("/")} className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-slate-900">Cliniq</p>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hecho para consultorios</p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-black text-slate-600 hover:text-teal-700 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLoginMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all"
              >
                <span>Acceso medico</span>
                <ChevronDown size={16} />
              </button>

              {loginMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+12px)] w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200">
                  <button
                    type="button"
                    onClick={() => onNavigate("/login")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    <Lock size={16} className="text-teal-600" />
                    <span>Soy medico</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 lg:hidden"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={() => onNavigate("/login")} className="rounded-2xl bg-teal-600 px-4 py-3 text-left text-sm font-black text-white">
                Soy medico
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <RevealSection id="hero" className="pt-32 sm:pt-36">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-700">
                <ShieldCheck size={14} />
                <span>NOM-004 y agenda en un solo flujo</span>
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                El expediente clinico digital para tu consultorio
              </h1>
              <p className="mt-6 max-w-xl text-lg font-bold leading-8 text-slate-600">
                Gestiona pacientes, agenda citas y genera notas medicas que cumplen la NOM-004.
                Todo en un solo lugar.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-teal-200 hover:bg-teal-700 transition-all"
                >
                  <span>Solicitar demo</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-all"
                >
                  Ver funcionalidades
                </button>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/login")}
                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-teal-700 transition-colors"
              >
                <span>Eres medico? Inicia sesion aqui</span>
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-teal-200/50 via-white to-slate-200 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/80">
                <div className="rounded-[1.5rem] bg-slate-900 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Dashboard clinico</p>
                      <p className="mt-2 text-2xl font-black">Cliniq</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                      <p className="text-xs font-black uppercase text-slate-300">Citas hoy</p>
                      <p className="mt-1 text-3xl font-black">12</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase text-slate-300">Pacientes</p>
                      <p className="mt-2 text-xl font-black">1,284</p>
                      <p className="mt-2 text-sm font-bold text-slate-300">Expediente y portal del paciente conectados.</p>
                    </div>
                    <div className="rounded-2xl bg-teal-500/20 p-4 border border-teal-400/20">
                      <p className="text-xs font-black uppercase text-teal-200">Cumplimiento</p>
                      <p className="mt-2 text-xl font-black">NOM-004</p>
                      <p className="mt-2 text-sm font-bold text-teal-100">Notas, consentimiento, CIE-10 y auditoria.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Proximas citas</p>
                    <div className="mt-4 space-y-3">
                      {[
                        ["09:00", "Ana Garcia", "Seguimiento"],
                        ["10:30", "Roberto Solis", "Primera vez"],
                        ["12:00", "Elena Pena", "Resultados"],
                      ].map(([time, name, reason]) => (
                        <div key={time} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{name}</p>
                            <p className="text-xs font-bold text-slate-500">{reason}</p>
                          </div>
                          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-teal-100 bg-teal-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Portal del paciente</p>
                    <p className="mt-3 text-2xl font-black text-slate-900">Acceso privado unicamente por enlace seguro.</p>
                    <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
                      Tus pacientes consultan citas, medicamentos y cuestionarios desde su celular usando el enlace con token que comparte el medico.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="patient-access" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 shadow-lg shadow-teal-100/40 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200">
                  <UserRound size={24} />
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Eres paciente?</h2>
                <p className="mt-3 max-w-xl text-base font-bold leading-8 text-slate-600">
                  Tu expediente no se consulta con CURP ni con inicio de sesion publico. El acceso solo funciona con el enlace privado con token que te comparte tu medico.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white bg-white p-5 shadow-xl shadow-teal-100/40">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Acceso al portal</p>
                <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-lg font-black text-slate-900">Necesitas el link directo del doctor</p>
                  <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
                    Si todavia no lo tienes, solicitalo a tu medico por WhatsApp o durante tu consulta. Ese enlace es la unica forma valida de abrir tu expediente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="features" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Funcionalidades</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Todo lo que necesitas para tu consultorio
            </h2>
            <p className="mt-4 text-base font-bold leading-8 text-slate-600">
              Desde la primera cita hasta el seguimiento clinico, Cliniq conecta agenda, expediente, recetas y portal del paciente en un solo flujo.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </RevealSection>

        <RevealSection id="pricing" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Precios</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Un precio simple, sin sorpresas
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-2xl shadow-teal-100/60">
              <div className="bg-slate-950 px-8 py-8 text-white">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-300">Plan unico</p>
                <h3 className="mt-3 text-3xl font-black">Todo incluido</h3>
                <div className="mt-5 flex items-end justify-center gap-2 text-center">
                  <span className="text-5xl font-black text-white">$399</span>
                  <span className="pb-1 text-base font-black text-slate-300">/ mes</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-300">IVA incluido</p>
              </div>

              <div className="p-8">
                <ul className="space-y-4">
                  {[
                    "Expediente clinico digital ilimitado",
                    "Agenda con citas online",
                    "Portal del paciente",
                    "Recetas e impresion de notas",
                    "Cumplimiento NOM-004 y NOM-024",
                    "Soporte incluido",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] font-black text-teal-700">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all"
                >
                  Solicitar demo
                </button>

                <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  Sin contratos. Cancela cuando quieras.
                </p>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="testimonials" className="mt-20 bg-slate-100/80 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Testimonios</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Lo que dicen los medicos que ya lo usan
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-lg font-black text-teal-700">
                      {item.initials}
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900">{item.name}</p>
                      <p className="text-sm font-bold text-slate-500">{item.specialty}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-bold leading-7 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="faq" className="mx-auto mt-20 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">FAQ</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map((item, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div key={item.question} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-base font-black text-slate-900">{item.question}</span>
                    {isOpen ? <ChevronUp size={18} className="text-teal-700" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-100 px-6 py-5 text-sm font-bold leading-7 text-slate-600">
                      {item.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </RevealSection>

        <RevealSection id="contact" className="mt-20 bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-300">Solicita tu demo</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                  Listo para digitalizar tu consultorio?
                </h2>
                <p className="mt-5 text-base font-bold leading-8 text-slate-300">
                  Solicita una demo gratuita y te mostramos como funciona en 20 minutos.
                </p>
              </div>

              <form onSubmit={handleDemoSubmit} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Nombre</label>
                    <input
                      value={demoForm.nombre}
                      onChange={(e) => setDemoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Email</label>
                    <input
                      type="email"
                      value={demoForm.email}
                      onChange={(e) => setDemoForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="nombre@consultorio.mx"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Telefono</label>
                    <input
                      value={demoForm.telefono}
                      onChange={(e) => setDemoForm((prev) => ({ ...prev, telefono: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="664 000 0000"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Especialidad medica</label>
                    <input
                      value={demoForm.especialidad}
                      onChange={(e) => setDemoForm((prev) => ({ ...prev, especialidad: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="Medicina general"
                    />
                  </div>
                </div>

                {demoMessage ? (
                  <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">
                    {demoMessage}
                  </div>
                ) : null}
                {demoError ? (
                  <div className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">
                    {demoError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmittingDemo}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-teal-900/30 hover:bg-teal-400 transition-all disabled:opacity-60"
                >
                  {isSubmittingDemo ? "Enviando..." : "Solicitar demo"}
                </button>
              </form>
            </div>
          </div>
        </RevealSection>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-100">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-slate-900">Cliniq</p>
              <p className="text-xs font-bold text-slate-500">Hecho para consultorios en Mexico</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm font-black text-slate-500">
            <button type="button" className="hover:text-teal-700 transition-colors">Aviso de privacidad</button>
            <button type="button" className="hover:text-teal-700 transition-colors">Terminos y condiciones</button>
          </div>

          <div className="text-sm font-bold text-slate-500">
            <p>© 2025 Cliniq. Todos los derechos reservados.</p>
            <p className="mt-1">Hecho en Mexico</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
