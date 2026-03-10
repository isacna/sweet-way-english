import Image from "next/image";
import { AlternatingTitle } from "@/components/AlternatingTitle";
import { Button } from "@/components/Button";
import { Navbar } from "@/components/Navbar";
import { NavbarAuth } from "@/components/NavbarAuth";

export default function HomePage() {
    return (
        <div className="relative min-h-screen">
            <div
                className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat blur-sm"
                style={{ backgroundImage: "url(/background.png)" }}
                aria-hidden
            />
            <div
                className="fixed inset-0 -z-10 bg-[#F8F8FA]/70"
                aria-hidden
            />
            <Navbar variant="home" right={<NavbarAuth />} />

            <main className="pt-28 pb-20 px-8 max-w-4xl mx-auto">
                <section className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 text-[#4A4A4A] text-sm mb-6">
                        <Image
                        src="/icons/book.svg"
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4"
                    />
                        Plataforma de ensino de inglês
                    </div>
                    <AlternatingTitle />
                    <p className="text-lg text-[#4A4A4A] max-w-2xl mx-auto mb-8">
                        A plataforma que conecta professores e alunos, centralizando
                        materiais, atividades e o acompanhamento do progresso em um só
                        lugar.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button href="/cadastrar" variant="primary" size="md">
                            Comece agora
                            <span aria-hidden>→</span>
                        </Button>
                        <Button href="/entrar" variant="secondary" size="md">
                            Já tenho conta
                        </Button>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">
                        Tudo que você precisa para ensinar e aprender
                    </h2>
                    <p className="text-[#4A4A4A] mb-10">
                        Ferramentas pensadas para facilitar a experiência de ensino
                        presencial de idiomas.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <article className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
                            <div className="w-12 h-12 rounded-lg bg-[#8A4FF7]/10 flex items-center justify-center mb-4">
                                <Image
                                src="/icons/users-gear.svg"
                                alt=""
                                width={24}
                                height={24}
                                className="h-6 w-6"
                            />
                            </div>
                            <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                                Gerenciamento de Turmas
                            </h3>
                            <p className="text-[#4A4A4A]">
                                Crie turmas, adicione alunos com códigos de convite e organize
                                suas aulas de forma simples.
                            </p>
                        </article>
                        <article className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
                            <div className="w-12 h-12 rounded-lg bg-[#8A4FF7]/10 flex items-center justify-center mb-4">
                                <Image
                                src="/icons/book-open.svg"
                                alt=""
                                width={24}
                                height={24}
                                className="h-6 w-6"
                            />
                            </div>
                            <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                                Atividades e Materiais
                            </h3>
                            <p className="text-[#4A4A4A]">
                                Distribua exercícios, leituras, quizzes e tarefas diretamente na
                                plataforma.
                            </p>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    );
}
