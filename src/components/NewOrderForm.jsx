import { useMemo, useState } from "react";
import { Link2, User } from "lucide-react";
import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { parseSellerInput } from "../../shared/parseSeller.js";

export function NewOrderForm({ onSubmit, creating, error }) {
  const [sellerMode, setSellerMode] = useState("username");
  const [seller, setSeller] = useState("");

  const parsedSeller = useMemo(() => {
    const direct = parseSellerInput(seller);
    if (direct) return { username: direct, source: "seller" };
    const record = parseDiscogsRecordUrl(seller);
    if (record.valid && record.listingId) {
      return { username: null, source: "listing", listingId: record.listingId };
    }
    return null;
  }, [seller]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = seller.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
  }

  return (
    <form className="card form-card" onSubmit={handleCreate}>
      <h2>Novo naročilo</h2>

      <div className="tabs seller-tabs">
        <button
          type="button"
          className={sellerMode === "username" ? "active" : ""}
          onClick={() => setSellerMode("username")}
        >
          <User size={16} />
          Uporabniško ime
        </button>
        <button
          type="button"
          className={sellerMode === "url" ? "active" : ""}
          onClick={() => setSellerMode("url")}
        >
          <Link2 size={16} />
          URL
        </button>
      </div>

      <label>
        {sellerMode === "username" ? "Seller uporabniško ime" : "Seller URL"}
        <input
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          placeholder={
            sellerMode === "username"
              ? "vinyl_japan_tokyo"
              : "https://www.discogs.com/seller/…/profile"
          }
          required
          disabled={creating}
        />
      </label>

      {parsedSeller?.username && (
        <p className="muted fine">
          Seller: <code>@{parsedSeller.username}</code>
        </p>
      )}

      {parsedSeller?.source === "listing" && (
        <p className="muted fine">
          Listing URL — sellerja poiščemo iz Discogs ob odpiranju naročila.
        </p>
      )}

      {seller.trim() && !parsedSeller && (
        <p className="form-error">Ne prepoznam Discogs povezave. Preveri URL.</p>
      )}

      {error && <p className="form-error">{error}</p>}

      <p className="muted fine">
        Naslov: <code>Naročilo#····</code>
        {parsedSeller?.username && (
          <>
            {" "}
            · <code>@{parsedSeller.username}</code>
          </>
        )}
      </p>

      <button className="btn btn-primary" type="submit" disabled={creating || !seller.trim()}>
        {creating ? "Odpiram…" : "Odpri naročilo"}
      </button>
    </form>
  );
}
