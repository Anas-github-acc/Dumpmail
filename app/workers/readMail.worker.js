import { fetchReplies } from "../services/mail/read.js";
import { supabase } from "../services/db/supabase.js";

export async function readMailJob() {
  const { data: sentMails, error } = await supabase.rpc("rpc_get_sent_threads");

  if (error) {console.error("[Error]", error); return;}

  const replies = await fetchReplies(sentMails);

  for (const reply of replies) {
    await supabase.rpc("rpc_mark_replied", {
      p_message_id: reply.original_message_id
    });
  }
}