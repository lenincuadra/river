import { redirect } from "next/navigation";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!process.env.RIVER_PASSWORD) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-5">
      <form
        action={loginAction}
        className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-border bg-card p-8"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-river text-base font-extrabold text-background">
          1R
        </span>
        <div className="text-sm font-extrabold tracking-wider">RIVER</div>
        <Input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Contraseña"
          className="text-center"
        />
        {error && (
          <p className="text-xs text-del">Contraseña incorrecta, probá de nuevo.</p>
        )}
        <Button type="submit" className="w-full" size="sm">
          Entrar
        </Button>
      </form>
    </div>
  );
}
