import Link from "next/link";
import { revalidatePath } from "next/cache";
import { LayoutDashboard, MessageCircle, Layers, ListChecks, Map, NotebookPen, Mail, BookOpen } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE, IDIOMA_RE, getActiveLanguage, setActiveLanguage } from "@/lib/profile/active-profile";
import { ensureLanguageProfile, listLanguageProfiles } from "@/lib/profile/language-profiles";
import { LanguageSwitcher } from "./language-switcher";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel", Icon: LayoutDashboard },
  { href: "/dashboard/cenarios", label: "Cenários", Icon: MessageCircle },
  { href: "/dashboard/flashcards", label: "Flashcards", Icon: Layers },
  { href: "/dashboard/atividades", label: "Atividades", Icon: ListChecks },
  { href: "/dashboard/vocabulario", label: "Vocabulário", Icon: BookOpen },
  { href: "/dashboard/plano", label: "Plano", Icon: Map },
  { href: "/dashboard/erros", label: "Erros", Icon: NotebookPen },
] as const;

async function switchLanguage(formData: FormData) {
  "use server";
  const idioma = String(formData.get("idioma") ?? "");
  if (!IDIOMA_RE.test(idioma)) return;
  setActiveLanguage(idioma);
  revalidatePath("/dashboard", "layout");
}

async function criarIdioma(formData: FormData) {
  "use server";
  const idioma = String(formData.get("novo_idioma") ?? "").trim().toLowerCase();
  if (!IDIOMA_RE.test(idioma)) return;

  try {
    await ensureLanguageProfile(supabaseAdmin(), idioma);
  } catch (error) {
    console.error("[dashboard] falha ao criar perfil de idioma:", (error as Error).message);
    return;
  }
  setActiveLanguage(idioma);
  revalidatePath("/dashboard", "layout");
}

export async function DashboardHeader({ current }: { current: (typeof NAV_ITEMS)[number]["href"] }) {
  const perfis = await listLanguageProfiles(supabaseAdmin()).catch(() => []);
  const idiomas = perfis.length > 0 ? perfis.map((p) => p.idioma_alvo ?? DEFAULT_LANGUAGE) : [DEFAULT_LANGUAGE];
  const ativo = getActiveLanguage();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4 sm:py-5">
        <Link href="/" className="group flex items-center gap-2 font-display text-lg tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stamp text-xs text-stamp transition-colors group-hover:bg-stamp group-hover:text-paper">
            C
          </span>
          Correio
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-1 text-sm sm:w-auto">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={current === href ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                current === href
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-paper-shade hover:text-ink"
              }`}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          ))}
          <Link
            href="/connect"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-shade hover:text-ink"
          >
            <Mail size={15} strokeWidth={1.75} aria-hidden="true" />
            Conectar ao Claude
          </Link>
          <div className="shrink-0 border-l border-line pl-3">
            <LanguageSwitcher
              idiomas={idiomas}
              ativo={ativo}
              switchAction={switchLanguage}
              criarAction={criarIdioma}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
