import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";

const stats = [
  {
    label: "Total de Alunos",
    value: "42",
    icon: "users",
    color: "bg-[#8A4FF7]/10 text-[#8A4FF7]",
  },
  {
    label: "Para Corrigir",
    value: "15",
    icon: "check",
    color: "bg-orange-100 text-orange-600",
  },
  {
    label: "Aulas na Semana",
    value: "8",
    icon: "calendar",
    color: "bg-green-100 text-green-600",
  },
];

const submissions = [
  {
    initial: "Is",
    name: "Isac Nunes",
    activity: "Speaking Practice L4 • Turma 01",
    time: "Há 2 horas",
  },
  {
    initial: "An",
    name: "Ana Silva",
    activity: "Reading Comprehension • Turma A2",
    time: "Há 5 horas",
  },
  {
    initial: "Ca",
    name: "Carlos Mendes",
    activity: "Grammar Quiz • Turma 01",
    time: "Ontem",
  },
];

const classes = [
  { name: "Turma B1", next: "Hoje, 19:00", students: 12 },
  { name: "Turma A2", next: "Amanhã, 18:30", students: 15 },
  { name: "Conversação Avançado", next: "Sexta, 20:00", students: 8 },
];

export default function ProfessorDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Painel do Professor
          </h1>
          <p className="text-[#4A4A4A] mt-1">
            Visão geral das suas turmas e atividades.
          </p>
        </div>
        <Button href="/professor/atividade/nova" variant="primary" size="md">
          <Image src="/icons/play-white.svg" alt="" width={18} height={18} />
          Nova Atividade
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm"
          >
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${stat.color}`}
            >
              {stat.icon === "users" && (
                <Image src="/icons/users-purple.svg" alt="" width={24} height={24} />
              )}
              {stat.icon === "check" && (
                <Image src="/icons/check-square-orange.svg" alt="" width={24} height={24} />
              )}
              {stat.icon === "calendar" && (
                <Image src="/icons/calendar-green.svg" alt="" width={24} height={24} />
              )}
            </div>
            <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
            <p className="text-sm text-[#4A4A4A]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">
            Submissões Recentes
          </h2>
          <p className="text-sm text-[#4A4A4A] mb-6">
            Atividades aguardando o seu feedback
          </p>
          <div className="divide-y divide-gray-100">
            {submissions.map((sub) => (
              <div
                key={sub.name}
                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-[#4A4A4A]">
                      {sub.initial}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A1A1A] truncate">
                      {sub.name}
                    </p>
                    <p className="text-sm text-[#4A4A4A] truncate">{sub.activity}</p>
                    <p className="text-xs text-[#4A4A4A] mt-0.5">{sub.time}</p>
                  </div>
                </div>
                <Button href="#" variant="secondary" size="sm">
                  Avaliar
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">
            Minhas Turmas
          </h2>
          <div className="space-y-4">
            {classes.map((cls) => (
              <div
                key={cls.name}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-[#1A1A1A]">{cls.name}</p>
                  <p className="text-sm text-[#4A4A4A]">
                    Próxima aula: {cls.next}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-sm text-[#4A4A4A]">
                  {cls.students} alunos
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/professor/turmas"
            className="mt-4 inline-block text-sm font-medium text-[#8A4FF7] hover:text-[#7742e0]"
          >
            Ver todas as turmas
          </Link>
        </div>
      </div>
    </div>
  );
}
