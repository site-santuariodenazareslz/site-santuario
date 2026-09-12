import { google, type Auth } from "googleapis";
import type { JWTInput } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

export type GoogleClientAuth = Auth.GoogleAuth;

export async function createGoogleAuth(): Promise<GoogleClientAuth> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!json) {
    throw new Error(
      "Defina GOOGLE_SERVICE_ACCOUNT_JSON no arquivo .env com o JSON completo da chave da conta de serviço.",
    );
  }

  return new google.auth.GoogleAuth({
    credentials: parseServiceAccountJson(json),
    scopes: SCOPES,
  });
}

export async function getAuthAccessToken(
  auth: GoogleClientAuth,
): Promise<string | null> {
  const token = await auth.getAccessToken();
  return token ?? null;
}

function parseServiceAccountJson(value: string): JWTInput {
  let parsed: JWTInput;
  try {
    parsed = JSON.parse(value) as JWTInput;
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON precisa ser o JSON completo da chave da conta de serviço. No .env, use uma única linha ou envolva o JSON multilinha em aspas simples.",
    );
  }
  if (parsed.type !== "service_account") {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON não é uma chave de conta de serviço.",
    );
  }
  return parsed;
}
