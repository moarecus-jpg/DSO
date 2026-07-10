import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NewOrderForm } from "../components/NewOrderForm.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { formatOrderTitle } from "../../shared/orderTitle.js";
import { api } from "../api.js";

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [query, setQuery] = useState("");

  const showForm = searchParams.get("new") === "1";

  async function loadSessions() {
    const d = await api("/api/sessions");
    setSessions(d.sessions);
  }

  useEffect(() => {
    loadSessions().catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const title =
        s.order_number != null
          ? formatOrderTitle(s.order_number, s.seller_username)
          : s.title ?? "";
      return (
        title.toLowerCase().includes(q) ||
        s.seller_username?.toLowerCase().includes(q)
      );
    });
  }, [sessions, query]);

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
    <div className="page page-orders">
      {showForm && (
        <NewOrderForm
          onSubmit={handleCreate}
          creating={creating}
          error={createError}
        />
      )}

      <OrdersPageHeader
        title="Odprta naročila"
        subtitle="Seznam vseh trenutno odprtih naročil"
        query={query}
        onQueryChange={setQuery}
      />

      <OrderList
        sessions={filteredSessions}
        loading={loading}
        emptyMessage={
          query.trim()
            ? "Ni zadetkov za iskanje."
            : "Ni odprtih naročil. Uporabi Novo naročilo v stranski vrstici."
        }
      />
    </div>
  );
}
