import crypto from "crypto";

function getSecret() {
  const raw = process.env.AES_SECRET ?? "dev-only-secret-change-me";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptApiKey(apiKey: string): string {
  if (!apiKey) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptApiKey(payload: string): string {
  if (!payload) return "";
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getSecret(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
