const API = "";

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Povezava s strežnikom je prekinjena. Počakaj in osveži stran (strežnik se morda znova zaganja)."
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Napaka strežnika (${res.status})`);
  }
  return data;
}
