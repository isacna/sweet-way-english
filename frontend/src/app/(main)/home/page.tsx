import { permanentRedirect } from "next/navigation";

// A página inicial mora em "/". Este endereço antigo fica só como redirecionamento permanente (308).
export default function HomeAntiga() {
  permanentRedirect("/");
}
