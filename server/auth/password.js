import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  if (!stored?.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const attempt = scryptSync(password, salt, KEY_LEN);
  if (expected.length !== attempt.length) return false;
  return timingSafeEqual(expected, attempt);
}
