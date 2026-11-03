const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:55424";

interface MailpitSearchResult {
  messages: Array<{ ID: string }>;
}

interface MailpitMessage {
  HTML: string;
}

/** Polls the local Mailpit inbox and returns the first link in the newest email to `to`. */
export async function waitForEmailLink(to: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages } = (await search.json()) as MailpitSearchResult;
    const latest = messages[0];

    if (latest) {
      const response = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
      const { HTML } = (await response.json()) as MailpitMessage;
      const href = /href="([^"]+)"/.exec(HTML)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No email with a link arrived for ${to}`);
}
