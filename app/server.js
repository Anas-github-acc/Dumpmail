import { createServer } from "http";
import { env } from "./config/env.js";
import { supabase } from "./services/db/supabase.js";

const PORT = Number(process.env.PORT || 3001);

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function getToken(request) {
  const authorization = request.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

async function getAuthenticatedUser(request) {
  const token = getToken(request);

  if (!token) {
    return { error: "Missing authorization token" };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: error?.message || "Unauthorized" };
  }

  return { user: data.user };
}

async function getUserSenderIds(userId) {
  const { data, error } = await supabase
    .from("sender_accounts")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  return { senderIds: (data || []).map((sender) => sender.id) };
}

async function getCount(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  return { count: count || 0 };
}

export function startApiServer() {
  const server = createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    const auth = await getAuthenticatedUser(request);

    if (auth.error || !auth.user) {
      sendJson(response, 401, { error: auth.error || "Unauthorized" });
      return;
    }

    const { user } = auth;

    if (url.pathname === "/api/me/profile" && request.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        sendJson(response, 500, { error: error.message });
        return;
      }

      sendJson(response, 200, { data });
      return;
    }

    if (url.pathname === "/api/me/profile" && (request.method === "PUT" || request.method === "PATCH")) {
      try {
        const body = await readJsonBody(request);
        const { data, error } = await supabase
          .from("profiles")
          .update({
            full_name: body.full_name ?? null,
            job_title: body.job_title ?? null,
          })
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (error) {
          sendJson(response, 500, { error: error.message });
          return;
        }

        sendJson(response, 200, { data });
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid request body" });
      }

      return;
    }

    if (url.pathname === "/api/templates" && request.method === "GET") {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        sendJson(response, 500, { error: error.message });
        return;
      }

      sendJson(response, 200, { data: data || [] });
      return;
    }

    if (url.pathname === "/api/campaigns" && request.method === "GET") {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        sendJson(response, 500, { error: error.message });
        return;
      }

      sendJson(response, 200, { data: data || [] });
      return;
    }

    if (url.pathname === "/api/leads" && request.method === "GET") {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        sendJson(response, 500, { error: error.message });
        return;
      }

      sendJson(response, 200, { data: data || [] });
      return;
    }

    if (url.pathname === "/api/senders" && request.method === "GET") {
      const { data, error } = await supabase
        .from("sender_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        sendJson(response, 500, { error: error.message });
        return;
      }

      sendJson(response, 200, { data: data || [] });
      return;
    }

    if (url.pathname === "/api/events" && request.method === "GET") {
      const senderIdsResult = await getUserSenderIds(user.id);

      if (senderIdsResult.error) {
        sendJson(response, 500, { error: senderIdsResult.error });
        return;
      }

      if (!senderIdsResult.senderIds.length) {
        sendJson(response, 200, { data: [] });
        return;
      }

      const { data, error } = await supabase
        .from("email_events")
        .select("*")
        .in("sender_account_id", senderIdsResult.senderIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        sendJson(response, 500, { error: error.message });
        return;
      }

      sendJson(response, 200, { data: data || [] });
      return;
    }

    if (url.pathname === "/api/dashboard/stats" && request.method === "GET") {
      const [campaigns, leads, templates, senders] = await Promise.all([
        getCount("campaigns", user.id),
        getCount("leads", user.id),
        getCount("email_templates", user.id),
        getCount("sender_accounts", user.id),
      ]);

      const senderIdsResult = await getUserSenderIds(user.id);

      if (campaigns.error || leads.error || templates.error || senders.error || senderIdsResult.error) {
        sendJson(response, 500, {
          error:
            campaigns.error ||
            leads.error ||
            templates.error ||
            senders.error ||
            senderIdsResult.error,
        });
        return;
      }

      let events = 0;

      if (senderIdsResult.senderIds.length) {
        const { count, error } = await supabase
          .from("email_events")
          .select("*", { count: "exact", head: true })
          .in("sender_account_id", senderIdsResult.senderIds);

        if (error) {
          sendJson(response, 500, { error: error.message });
          return;
        }

        events = count || 0;
      }

      sendJson(response, 200, {
        data: {
          campaigns: campaigns.count || 0,
          leads: leads.count || 0,
          templates: templates.count || 0,
          senders: senders.count || 0,
          events,
        },
      });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  });

  server.listen(PORT, () => {
    console.log(`Admin API listening on http://localhost:${PORT}`);
    if (!env.SUPABASE_SERVICE_KEY) {
      console.warn("SUPABASE_SERVICE_KEY is not configured");
    }
  });

  return server;
}