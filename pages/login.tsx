import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { LoadingButton, Spinner } from "../components/LoadingUI";

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
      <div
        className={`card login-card${loading ? " soft-loading" : ""}`}
        style={{ maxWidth: "400px", margin: "40px auto" }}
        aria-busy={loading ? "true" : "false"}
      >
        <form
          onSubmit={handleSubmit}
          className="flex-column"
          style={{ gap: "16px" }}
        >
          <fieldset
            className="login-fields"
            disabled={loading}
            aria-disabled={loading ? "true" : "false"}
          >
            <div className="flex-column" style={{ gap: "8px" }}>
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex-column" style={{ gap: "8px" }}>
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </fieldset>
          {error && (
            <div className="error-message" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
          {loading ? (
            <div className="refresh-status" role="status" aria-live="polite">
              <Spinner className="refresh-status-spinner" />
              Verificando credenciais...
            </div>
          ) : null}
          <LoadingButton
            type="submit"
            className="button"
            loading={loading}
            loadingLabel="Entrando..."
            style={{ marginTop: "8px" }}
          >
            Entrar
          </LoadingButton>
        </form>
      </div>
    </Layout>
  );
}
