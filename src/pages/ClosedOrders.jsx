import { useEffect, useState } from "react";
import { OrderList } from "../components/OrderList.jsx";
import { PageHero } from "../components/PageHero.jsx";
import { api } from "../api.js";

export function ClosedOrders() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/sessions?status=closed")
      .then((d) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <PageHero
        title="Zaključena naročila."
        subtitle="Pretekla skupinska naročila, ki niso več odprta."
      />

      <section className="section-block">
        <OrderList
          sessions={sessions}
          loading={loading}
          emptyMessage="Ni zaključenih naročil."
        />
      </section>
    </div>
  );
}
