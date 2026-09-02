import { useState } from "react";
import { Link } from "react-router-dom";
import { PlacListingCard } from "../components/PlacListingCard.jsx";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";

const SAMPLE_SELLER = {
  id: "preview-seller",
  name: "Marko Čuš",
  discogsUsername: "funkphenomana",
  picture: null,
  discogsAvatarUrl: null,
};

const SAMPLE_LISTINGS = [
  {
    id: "preview-1",
    userId: SAMPLE_SELLER.id,
    artist: "Pink Floyd",
    title: "The Dark Side Of The Moon",
    thumbnailUrl: null,
    year: 1973,
    genre: "Rock",
    country: "UK",
    format: "LP, Album, Reissue",
    mediaCondition: "Very Good Plus (VG+)",
    sleeveCondition: "Very Good Plus (VG+)",
    priceValue: 80,
    listingType: "vinyl",
    status: "active",
    seller: SAMPLE_SELLER,
  },
  {
    id: "preview-2",
    userId: SAMPLE_SELLER.id,
    artist: "Daft Punk",
    title: "Random Access Memories",
    thumbnailUrl: null,
    year: 2013,
    genre: "Electronic",
    country: "France",
    format: "2xLP, Album",
    mediaCondition: "Near Mint (NM)",
    sleeveCondition: null,
    priceValue: 70,
    listingType: "vinyl",
    status: "active",
    seller: SAMPLE_SELLER,
  },
  {
    id: "preview-3",
    userId: SAMPLE_SELLER.id,
    artist: "Fleetwood Mac",
    title: "Rumours",
    thumbnailUrl: null,
    year: 1977,
    genre: "Rock",
    country: "US",
    format: null,
    mediaCondition: "Very Good (VG)",
    sleeveCondition: "Good Plus (G+)",
    priceValue: 45,
    listingType: "vinyl",
    status: "active",
    seller: SAMPLE_SELLER,
  },
  {
    id: "preview-4",
    userId: SAMPLE_SELLER.id,
    artist: "Massive Attack",
    title: "Mezzanine",
    thumbnailUrl: null,
    year: 1998,
    genre: "Electronic",
    country: "UK",
    format: "LP, Album",
    mediaCondition: "Mint (M)",
    sleeveCondition: null,
    priceValue: 55,
    listingType: "vinyl",
    status: "active",
    seller: SAMPLE_SELLER,
  },
];

export function MarketplaceBuyerPreview() {
  const [query, setQuery] = useState("");

  return (
    <div className="page page-orders page-plac page-plac-user">
      <p className="preview-banner">Buyer preview — sample listings with real marketplace UI</p>

        <PlacPageHeader
          backTo={{ to: "/plac", label: "Back to marketplace" }}
          titleLeading={
            <UserAvatar
              name={SAMPLE_SELLER.name}
              avatarUrl={null}
              className="plac-user-avatar"
              size={56}
            />
          }
          title="@funkphenomana"
          subtitle="Marko Čuš · 98 listings"
          query={query}
          onQueryChange={setQuery}
          placeholder="Search artist, title, genre…"
          onSell={() => {}}
        />

        <div className="plac-grid plac-user-gallery plac-grid--large">
          {SAMPLE_LISTINGS.map((listing) => (
            <PlacListingCard
              key={listing.id}
              listing={listing}
              showSeller={false}
              showCart
              detailLink={false}
            />
          ))}
        </div>

        <p className="muted fine preview-footer-note">
          Open a real seller shop from <Link to="/plac">Marketplace</Link>.
        </p>
    </div>
  );
}
