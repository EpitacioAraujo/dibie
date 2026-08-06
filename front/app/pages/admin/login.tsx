import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  // se já houver sessão no storage, entra direto
  useEffect(() => {
    useAuth.persist.rehydrate();
    if (useAuth.getState().token) navigate("/__/admin", { replace: true });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/__/admin", { replace: true });
    } catch {
      setError("E-mail ou senha inválidos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-[min(360px,100%)] rounded-2xl bg-ink-5 p-8"
      >
        <p className="mb-6 text-h6">dibiê admin</p>
        {error && <p className="mb-4 text-body text-wine">{error}</p>}
        <label className="mb-3 block text-body">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
          />
        </label>
        <label className="mb-6 block text-body">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-ink-10 bg-bg px-3 py-2 outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full cursor-pointer rounded-full bg-ink px-4 py-3 text-body text-white disabled:opacity-60"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
