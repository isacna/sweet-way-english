import Image from "next/image";
import { AlternatingTitle } from "@/components/AlternatingTitle";
import { Button } from "@/components/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <main className="pt-12 pb-20 px-8 max-w-6xl mx-auto">
        <div className="flex justify-center mb-12">
          <Image
            src="/logo-sweet.png"
            alt="Sweet Way English - Learn. Speak. Achieve."
            width={340}
            height={340}
            className="w-auto h-auto max-w-[min(92vw,380px)] sm:max-w-[440px] md:max-w-[500px] object-contain"
            priority
          />
        </div>
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24">
          <div className="order-2 lg:order-1">
            <AlternatingTitle />
            <p className="text-lg text-[#4A4A4A] mb-8 max-w-xl">
              Sweet Way English centraliza seus materiais, atividades e feedbacks
              em um único lugar. Feito para professores que buscam excelência e
              alunos que querem resultados. Novos alunos são cadastrados pelo
              professor na turma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button href="/login?tipo=aluno" variant="primary" size="md" className="rounded-xl">
                Entrar como Aluno
              </Button>
              <Button href="/login?tipo=professor" variant="secondary" size="md" className="rounded-xl">
                Entrar como Professor
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] max-h-[560px]">
              <Image
                src="/hero-city.png"
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="absolute -bottom-6 -left-4 lg:left-0 right-4 lg:right-auto max-w-xs p-5 rounded-2xl bg-white shadow-lg border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-[#8A4FF7]/10 flex items-center justify-center mb-3">
                <Image src="/icons/star.svg" alt="" width={24} height={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-1">
                Feedback em tempo real
              </h3>
              <p className="text-sm text-[#4A4A4A]">
                Acompanhe o progresso dos seus alunos com avaliações detalhadas e
                notas.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="grid sm:grid-cols-3 gap-6">
            <article className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#8A4FF7]/10 flex items-center justify-center mb-4">
                <Image
                  src="/icons/book-open.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="opacity-90"
                />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                Materiais Centralizados
              </h3>
              <p className="text-[#4A4A4A]">
                Tudo em um só lugar. Acesse exercícios, leituras e recursos quando
                precisar.
              </p>
            </article>
            <article className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#8A4FF7]/10 flex items-center justify-center mb-4">
                <Image
                  src="/icons/users-gear.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="opacity-90"
                />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                Turmas Organizadas
              </h3>
              <p className="text-[#4A4A4A]">
                Crie turmas, adicione alunos e gerencie suas aulas de forma
                simples.
              </p>
            </article>
            <article className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#8A4FF7]/10 flex items-center justify-center mb-4">
                <Image
                  src="/icons/star.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="opacity-90"
                />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                Avaliações Detalhadas
              </h3>
              <p className="text-[#4A4A4A]">
                Feedback em tempo real para acompanhar a evolução de cada aluno.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
