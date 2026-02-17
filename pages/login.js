import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
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
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.message || "Login falhou");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Login" subtitle="Autentique-se para gerenciar cargas.">
      <div className="card" style={{ maxWidth: "400px", margin: "40px auto" }}>
        <form
          onSubmit={handleSubmit}
          className="flex-column"
          style={{ gap: "16px" }}
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
          {error && (
            <div className="error-message" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            className="button"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
