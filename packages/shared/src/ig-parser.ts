import { extractInstagramUrls } from "./urls";

export type IgThreadSummary = {
  folderName: string;
  displayName: string;
  messageCount: number;
  urls: string[];
};

type IgMessage = {
  share?: { link?: string };
  content?: string;
};

type IgConversation = {
  participants?: { name?: string }[];
  messages?: IgMessage[];
};

function threadDisplayName(folderName: string, data: IgConversation): string {
  const names = data.participants
    ?.map((p) => p.name)
    .filter(Boolean) as string[] | undefined;
  if (names?.length) return names.join(", ");
  return folderName.replace(/_/g, " ");
}

export function parseConversationJson(
  folderName: string,
  raw: unknown
): IgThreadSummary {
  const data = raw as IgConversation;
  const urls = new Set<string>();

  for (const msg of data.messages ?? []) {
    if (msg.share?.link) {
      for (const u of extractInstagramUrls(msg.share.link)) urls.add(u);
    }
    if (msg.content) {
      for (const u of extractInstagramUrls(msg.content)) urls.add(u);
    }
  }

  return {
    folderName,
    displayName: threadDisplayName(folderName, data),
    messageCount: data.messages?.length ?? 0,
    urls: [...urls],
  };
}

export function filterThreadsByConfig(
  threads: IgThreadSummary[],
  enabledFolders: Set<string>
): IgThreadSummary[] {
  if (enabledFolders.size === 0) return threads;
  return threads.filter((t) => enabledFolders.has(t.folderName));
}
