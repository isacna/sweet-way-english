import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";

const classes = [
  {
    name: "Turma B1 - Intermediário",
    schedule: "Segunda e Quarta, 19:00",
    students: 12,
    code: "94-81-2006",
    progress: 45,
  },
  {
    name: "Turma A2 - Iniciante",
    schedule: "Terça e Quinta, 18:30",
    students: 15,
    code: "94-42-380",
    progress: 20,
  },
  {
    name: "Conversação Avançada",
    schedule: "Sexta, 20:00",
    students: 8,
    code: "94-C5-2016",
    progress: 80,
  },
];

export default function TurmasPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Minhas Turmas
          </h1>
          <p className="text-[#4A4A4A] mt-1">
            Gerencie seus alunos e horários de aula.
          </p>
        </div>
        <Button href="/professor/turmas/nova" variant="primary" size="md">
          <Image src="/icons/plus-white.svg" alt="" width={18} height={18} />
          Nova Turma
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <article
            key={cls.code}
            className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A]">{cls.name}</h3>
              <button
                type="button"
                className="p-1 text-[#4A4A4A] hover:text-[#1A1A1A]"
                aria-label="Opções"
              >
                <Image src="/icons/more-vertical.svg" alt="" width={20} height={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#4A4A4A] mb-4">
              <p className="flex items-center gap-2">
                <Image src="/icons/calendar.svg" alt="" width={16} height={16} />
                {cls.schedule}
              </p>
              <p className="flex items-center gap-2">
                <Image src="/icons/users.svg" alt="" width={16} height={16} />
                {cls.students} Alunos
              </p>
              <p>
                Cod: {cls.code}
              </p>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4A4A4A]">Progresso do curso</span>
                <span className="font-medium text-[#1A1A1A]">{cls.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8A4FF7] transition-all"
                  style={{ width: `${cls.progress}%` }}
                />
              </div>
            </div>
            <Button
              href={`/professor/turmas/${cls.code}`}
              variant="secondary"
              size="md"
              className="mt-auto"
            >
              Acessar Turma
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
