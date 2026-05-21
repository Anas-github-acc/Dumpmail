import dotenv from "dotenv";
dotenv.config();

export const env = {
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  IMAP_HOST: process.env.IMAP_HOST,
  IMAP_PORT: process.env.IMAP_PORT,
  RESUME_PATH: process.env.RESUME_PATH,
  RESUME_FILENAME: process.env.RESUME_FILENAME,
  SEND_LIMIT: Number(process.env.SEND_LIMIT || 20),
  SEND_DELAY_MS: Number(process.env.SEND_DELAY_MS || 90000),
  REPLY_LOOKBACK_DAYS: Number(process.env.REPLY_LOOKBACK_DAYS || 14),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GOOGLE_AI_MODEL: process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash",
  AI_EMAIL_DEBUG: process.env.AI_EMAIL_DEBUG === "true",
  DISPOSABLE_EMAIL_DOMAINS: process.env.DISPOSABLE_EMAIL_DOMAINS || "",
  EMAIL_MX_LOOKUP_TIMEOUT_MS: Number(process.env.EMAIL_MX_LOOKUP_TIMEOUT_MS || 5000),
  USER_ID: process.env.USER_ID,
};
