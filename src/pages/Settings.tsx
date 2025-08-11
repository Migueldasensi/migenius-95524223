import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import ThemeToggle from "@/components/ThemeToggle";

export default function Settings() {
  return (
    <AppLayout>
      <Seo title="Configurações" description="Preferências de tema e conta." canonicalPath="/settings" />
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Ajuste suas preferências.</p>
        </header>
        <div>
          <h2 className="text-xl font-semibold mb-2">Tema</h2>
          <ThemeToggle />
        </div>
      </section>
    </AppLayout>
  );
}
