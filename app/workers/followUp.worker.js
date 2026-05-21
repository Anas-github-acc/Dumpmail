import { runSendMail } from "../services/mail/send.js";
// import { followUpEmail } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";
import { log } from "../utils/logger.js";
import { validateRecipientDeliverability } from "../utils/validator.js";

export async function followUpJob() {
  const { data: leads } = await supabase.rpc("rpc_get_followups");

  for (const lead of leads) {
    const recipientCheck = await validateRecipientDeliverability(lead.email);

    if (!recipientCheck.ok) {
      log([
        "followUpJob skipped lead",
        `lead_id=${lead.id}`,
        `email=${lead.email}`,
        `reason=${recipientCheck.reason}`
      ]);
      continue;
    }

    const mail = "Hello anas";

    const messageId = await runSendMail(
      lead.email,
      mail.subject,
      mail.body,
      {
        inReplyTo: lead.message_id
      }
    );

    await supabase.rpc("rpc_mark_followup", {
      p_lead_id: lead.id,
      p_message_id: messageId
    });

    await delay(env.SEND_DELAY_MS);
  }
}