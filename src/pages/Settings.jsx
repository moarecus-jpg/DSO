import { useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Disc3, ExternalLink, Unplug } from "lucide-react";

import { api } from "../api.js";

import { useAuth } from "../hooks/useAuth.jsx";

function discogsCallbackFallback() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/discogs/callback`;
  }
  return "http://localhost:5173/auth/discogs/callback";
}



export function Settings() {

  const { user, refresh } = useAuth();

  const [params] = useSearchParams();

  const [message, setMessage] = useState(null);

  const [messageType, setMessageType] = useState("ok");

  const [health, setHealth] = useState(null);



  useEffect(() => {

    fetch("/api/health")

      .then((r) => r.json())

      .then(setHealth)

      .catch(() => setHealth(null));

  }, []);



  useEffect(() => {

    const discogs = params.get("discogs");

    if (discogs === "connected") {

      setMessageType("ok");

      setMessage(

        params.get("mock") === "1"

          ? "Discogs povezan (demo način)."

          : "Discogs račun je povezan."

      );

      refresh();

    } else if (discogs === "error") {

      setMessageType("warn");

      setMessage(
        <>
          Povezava z Discogs ni uspela. V Discogs Developer pri aplikaciji DSO dodaj
          Callback URL:{" "}
          <code>
            {health?.discogsCallbackUrl ?? discogsCallbackFallback()}
          </code>
          . Nato znova klikni Poveži Discogs.
        </>
      );

    } else if (discogs === "nokeys") {

      setMessageType("warn");

      setMessage(

        "Manjkata DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET v .env datoteki."

      );

    }

  }, [params, refresh, health]);



  async function disconnect() {

    await api("/auth/discogs/disconnect", { method: "POST" });

    await refresh();

    setMessageType("ok");

    setMessage("Discogs račun je odklopljen.");

  }



  const discogsReady = health?.discogsConfigured === true;



  return (

    <div className="page">

      <h1>Nastavitve</h1>



      {message && (

        <div className={`banner ${messageType === "warn" ? "banner-warn" : "banner-ok"}`}>

          {message}

        </div>

      )}



      <div className="card">

        <h2>Račun DSO</h2>

        <p>

          <strong>{user?.name}</strong>

        </p>

        {user?.username && (

          <p className="muted">

            Uporabniško ime: <code>{user.username}</code>

          </p>

        )}

      </div>



      <div className="card">

        <h2>

          <Disc3 size={20} /> Discogs račun

        </h2>

        {user?.discogsConnected ? (

          <>

            <p>

              Povezan kot <strong>@{user.discogsUsername}</strong>

            </p>

            <p className="muted">

              Pri naročilih se prikaže tvoj Discogs uporabniški ime med sodelujočimi.

            </p>

            <button type="button" className="btn btn-ghost" onClick={disconnect}>

              <Unplug size={16} /> Odklopi Discogs

            </button>

          </>

        ) : (

          <>

            <p className="muted">

              Poveži svoj Discogs račun, da se pri skupinskih naročilih prikaže tvoje

              uporabniško ime (@…).

            </p>

            {discogsReady ? (

              <>

                <a href="/auth/discogs" className="btn btn-primary">

                  Poveži Discogs

                </a>

                <p className="fine-print muted">

                  Odpre se stran discogs.com za prijavo in potrditev dostopa.

                </p>

              </>

            ) : (

              <>

                <button type="button" className="btn btn-primary" disabled>

                  Poveži Discogs

                </button>

                <p className="fine-print muted">
                  Za pravo povezavo nastavi{" "}
                  <code>DISCOGS_CONSUMER_KEY</code> in <code>DISCOGS_CONSUMER_SECRET</code>{" "}
                  v Railway Variables ali lokalno v <code>.env</code>, iz{" "}
                  <a
                    href="https://www.discogs.com/settings/developers"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Discogs Developer
                    <ExternalLink size={12} style={{ marginLeft: 4 }} />
                  </a>
                  . Callback URL:{" "}
                  <code>{health?.discogsCallbackUrl ?? discogsCallbackFallback()}</code>
                </p>

                {health?.mockAuth && (

                  <p className="fine-print muted">

                    Brez ključev lahko v demo načinu uporabiš{" "}

                    <a href="/auth/discogs">demo Discogs povezavo</a> (vzorčni podatki).

                  </p>

                )}

              </>

            )}

          </>

        )}

      </div>

    </div>

  );

}

