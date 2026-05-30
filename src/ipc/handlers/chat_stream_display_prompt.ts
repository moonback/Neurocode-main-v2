type ChatHistoryMessage = {
  role: "user" | "assistant" | "system";
  content: unknown;
};

export function getStoredUserPrompt({
  displayPrompt,
  displayUserPrompt,
  userPrompt,
}: {
  displayPrompt?: string;
  displayUserPrompt?: string;
  userPrompt: string;
}) {
  return displayPrompt ?? displayUserPrompt ?? userPrompt;
}

export function replaceLastUserPromptForModel<T extends ChatHistoryMessage>(
  messageHistory: T[],
  userPrompt: string,
): T[] {
  for (let i = messageHistory.length - 1; i >= 0; i--) {
    if (messageHistory[i].role === "user") {
      return [
        ...messageHistory.slice(0, i),
        {
          ...messageHistory[i],
          content: userPrompt,
        } as T,
        ...messageHistory.slice(i + 1),
      ];
    }
  }

  return messageHistory;
}
