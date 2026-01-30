import crypto from "crypto";

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
