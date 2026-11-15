/** Notification hooks: approval-needed + reports. Generic webhook (email/WhatsApp via provider). */

export async function notify(subject: string, text: string): Promise<{ sent: boolean; via: string }> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) {
    console.log(`[notify] ${subject} — ${text.slice(0, 160)} (no NOTIFY_WEBHOOK_URL; hook only)`);
    return { sent: false, via: "log" };
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, text }),
    });
    return { sent: true, via: "webhook" };
  } catch {
    return { sent: false, via: "webhook-failed" };
  }
}
