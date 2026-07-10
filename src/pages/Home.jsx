import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NewOrderForm } from "../components/NewOrderForm.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { api } from "../api.js";

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const showForm = searchParams.get("new") === "1";

  async function loadSessions() {
    const d = await api("/api/sessions");
    setSessions(d.sessions);
  }

  useEffect(() => {
    loadSessions().catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate(sellerInput) {
    setCreateError(null);
    setCreating(true);
    try {
      const { session } = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ sellerUsername: sellerInput }),
      });
      navigate(`/session/${session.id}?add=1`, { replace: true });
    } catch (err) {
      setCreateError(err.message ?? "Naročila ni bilo mogoče odpreti.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      {showForm && (
        <NewOrderForm
          onSubmit={handleCreate}
          creating={creating}
          error={createError}
        />
      )}

      <section className="section-block">
        <h2 className="section-label">Odprta naročila</h2>
        <OrderList
        sessions={sessions}
        loading={loading}
          emptyMessage="Ni odprtih naročil. Uporabi Novo naročilo v stranski vrstici."
        />
      </section>
    </div>
  );
}
