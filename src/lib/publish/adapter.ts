import type { Item as DemoItem } from "@/lib/db/repo";

export type PublishResult = { externalId: string; url: string; adapter: string };

/** PublisherAdapter: publish(item) -> {externalId, url}. */
export interface PublisherAdapter {
  name: string;
  publish(item: DemoItem): Promise<PublishResult>;
  exportPackage(item: DemoItem): Record<string, unknown>;
}

/** MVP: manual export + user marks as posted. No auto-posting exists. */
export class ManualAdapter implements PublisherAdapter {
  name = "manual";
  exportPackage(item: DemoItem) {
    return {
      caption: item.captions[0] ?? "",
      hashtags: item.hashtags.join(" "),
      cta: item.cta,
      scheduled_for: item.scheduled_for,
      platform: item.platform,
      format: item.format,
      image_url: item.image_url ?? null,
      note: "Post manually, then mark as posted in AdvertiseOS.",
    };
  }
  async publish(item: DemoItem): Promise<PublishResult> {
    return { externalId: `manual-${item.id}-${Date.now()}`, url: "", adapter: "manual" };
  }
}

/**
 * Phase 3 stub: Meta (Instagram/Facebook) adapter behind FEATURE_META_PUBLISH.
 * Requires Meta app review (pages_manage_posts, instagram_content_publish).
 * See README "Meta approval" section. Throws until credentials + flag are set.
 */
export class MetaAdapter implements PublisherAdapter {
  name = "meta";
  exportPackage(item: DemoItem) {
    return new ManualAdapter().exportPackage(item);
  }
  async publish(): Promise<PublishResult> {
    throw new Error(
      "Meta publishing is disabled. Set FEATURE_META_PUBLISH=true with META_PAGE_TOKEN + META_IG_USER_ID after Meta app review."
    );
  }
}

export function getPublisher(): PublisherAdapter {
  if ((process.env.FEATURE_META_PUBLISH ?? "false") === "true") return new MetaAdapter();
  return new ManualAdapter();
}
