import { YoutubeTranscript } from "youtube-transcript";

export async function tryYouTubeCaptions(url: string): Promise<string | null> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(url);
    if (!items.length) return null;
    const text = items.map((i) => i.text).join(" ").trim();
    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}
