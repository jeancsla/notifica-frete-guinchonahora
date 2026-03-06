import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { LoadingButton, Spinner } from "../components/LoadingUI";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        await router.push("/dashboard");
      } else {
        const data = (await res.json()) as { message?: string };
        setError(data.message || "Login falhou");
      }
    } catch {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Login" subtitle="Autentique-se para gerenciar cargas.">
      <div className="max-w-md mx-auto mt-10">
        <Card
          className={loading ? "opacity-90 transition-opacity" : ""}
          aria-busy={loading ? "true" : "false"}
        >
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset className="space-y-4" disabled={loading}>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    placeholder="Digite seu usuário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Digite sua senha"
                  />
                </div>
              </fieldset>
              {error && (
                <div className="text-sm text-destructive font-medium">
                  {error}
                </div>
              )}
              {loading ? (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <Spinner className="w-4 h-4" />
                  Verificando credenciais...
                </div>
              ) : null}
              <LoadingButton
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                loading={loading}
                loadingLabel="Entrando..."
              >
                Entrar
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
