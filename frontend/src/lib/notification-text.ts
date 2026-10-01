import type { TranslationKeys } from "@/lib/i18n";

type Kind = "success" | "error" | "warning" | null;

const fill = (tpl: string, params: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? "");

/**
 * Render a notification in the current language.
 * New rows are stored as title "i18n:<code>" + JSON params; old rows are plain text.
 */
export function renderNotification(
  n: { title: string; message: string },
  t: TranslationKeys
): { title: string; message: string; kind: Kind } {
  if (n.title.startsWith("i18n:")) {
    const code = n.title.slice(5);
    let params: Record<string, string> = {};
    try {
      params = JSON.parse(n.message || "{}");
    } catch {
      params = {};
    }
    const tpl = t.profile.notificationTemplates;
    if (code === "payment_confirmed") {
      return { title: tpl.payment_confirmed_title, message: fill(tpl.payment_confirmed_message, params), kind: "success" };
    }
    if (code === "payment_rejected") {
      const reason = params.reason ? ` ${fill(tpl.payment_rejected_reason, params)}` : "";
      return { title: tpl.payment_rejected_title, message: fill(tpl.payment_rejected_message, params) + reason, kind: "error" };
    }
    if (code === "payment_review") {
      return { title: tpl.payment_review_title, message: fill(tpl.payment_review_message, params), kind: "warning" };
    }
  }
  // Legacy free-text notifications (Russian or Uzbek)
  const lower = n.title.toLowerCase();
  let kind: Kind = null;
  if (/подтвержд|tasdiqlan/.test(lower)) kind = "success";
  else if (/отклон|rad etil/.test(lower)) kind = "error";
  else if (/проверк|tekshiruv/.test(lower)) kind = "warning";
  return { title: n.title, message: n.message, kind };
}
