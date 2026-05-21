import nodemailer from "nodemailer";
import assert from "node:assert";
import { env } from "../../config/env.js";
import { decrypt } from "../../utils/crypto.js";


async function hashKey(key) {
  const msgBuffer = new TextEncoder().encode(key);
    
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

const transporters = new Map();

async function getTransportConfig(
  host,
  port,
  secure,
  user,
  pass
) {
  const key = await hashKey(`${host}:${port}:${user}`);

  if (transporters.has(key)) {
    return transporters.get(key);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: secure,
    auth: {
      user,
      pass
    }
  })

  transporters.set(key, transporter);
  return transporter;
}

export async function runSendMail(
  to,
  subject,
  text,
  smtp = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user_email: "",
    pass: "",
    live: ""
  },
  options = {}
) {
  assert(smtp.user_email && smtp.pass, "Both SMTP user and pass are required");

  const smtp_password = decrypt(smtp.pass);

  const transporter = await getTransportConfig(
    smtp.host,
    smtp.port,
    smtp.secure,
    smtp.user_email,
    smtp_password
  );
  
  const normalizedOptions =
    typeof options === "string"
      ? { inReplyTo: options, references: options }
      : options || {};


  const mailOptions = {
    from: `Anas <${smtp.user}>`,
    to,
    subject,
    text,
    attachments: normalizedOptions.attachments,
    list: {
      unsubscribe: {
        url: `https://${smtp.live ? smtp.live : ''}/unsubscribe?email=${smtp.user_email}&token=UNSUBSCRIBE_TOKEN`,
            comment: 'Unsubscribe from these emails'
        }
    },
    headers: {
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    }
  };

  if (normalizedOptions.inReplyTo) {
    mailOptions.inReplyTo = normalizedOptions.inReplyTo;
    mailOptions.references =
      normalizedOptions.references || normalizedOptions.inReplyTo;
  }

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}