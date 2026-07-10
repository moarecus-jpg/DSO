export const MOCK_USER = {
  id: "mock-user-1",
  google_id: "mock-google-1",
  email: "alex@example.com",
  name: "Alex",
  picture: null,
  discogs_username: "vinyl_alex",
  discogs_token: "mock",
  discogs_token_secret: "mock",
};

export const MOCK_USER_2 = {
  id: "mock-user-2",
  google_id: "mock-google-2",
  email: "maya@example.com",
  name: "Maya",
  picture: null,
  discogs_username: "crate_maya",
  discogs_token: null,
  discogs_token_secret: null,
};

export const MOCK_SESSION = {
  id: "mock-session-1",
  title: "Naročilo#0001",
  order_number: 1,
  seller_username: "vinyl_japan_tokyo",
  created_by: MOCK_USER.id,
  status: "open",
  created_at: new Date().toISOString(),
  creator_name: "Alex",
  member_count: 2,
  link_count: 1,
  links: [
    {
      id: "link-1",
      user_id: "mock-user-2",
      user_name: "Maya",
      url: "https://www.discogs.com/sell/item/8821003",
      listing_id: 8821003,
      release_id: 99999,
      label: "Unknown Artist — Rare 12\"",
      artist: "Unknown Artist",
      title: 'Rare 12"',
      price_value: 15,
      price_currency: "EUR",
      media_condition: "Good (G)",
      sleeve_condition: "Good Plus (G+)",
    },
  ],
};

export const MOCK_WANTLIST = [
  {
    id: 249504,
    notes: "Looking for NM",
    basic_information: {
      id: 249504,
      title: "Blue Lines",
      year: 1991,
      thumb: "",
      artists: [{ name: "Massive Attack" }],
    },
  },
  {
    id: 10362,
    notes: "",
    basic_information: {
      id: 10362,
      title: "Homework",
      year: 1997,
      thumb: "",
      artists: [{ name: "Daft Punk" }],
    },
  },
  {
    id: 451,
    notes: "Original press preferred",
    basic_information: {
      id: 451,
      title: "Remain In Light",
      year: 1980,
      thumb: "",
      artists: [{ name: "Talking Heads" }],
    },
  },
];

export const MOCK_INVENTORY = [
  {
    id: 8821001,
    status: "For Sale",
    condition: "Very Good Plus (VG+)",
    sleeve_condition: "Very Good Plus (VG+)",
    price: { currency: "EUR", value: 28.0 },
    release: {
      id: 249504,
      artist: "Massive Attack",
      title: "Blue Lines",
      thumbnail: "",
    },
  },
  {
    id: 8821002,
    status: "For Sale",
    condition: "Near Mint (NM or M-)",
    sleeve_condition: "Near Mint (NM or M-)",
    price: { currency: "EUR", value: 42.0 },
    release: {
      id: 10362,
      artist: "Daft Punk",
      title: "Homework",
      thumbnail: "",
    },
  },
  {
    id: 8821003,
    status: "For Sale",
    condition: "Good (G)",
    sleeve_condition: "Good Plus (G+)",
    price: { currency: "EUR", value: 15.0 },
    release: {
      id: 99999,
      artist: "Unknown Artist",
      title: "Rare 12\"",
      thumbnail: "",
    },
  },
];
