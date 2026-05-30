export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function isExpectedLocalModelConnectionError(
  value: unknown,
  providerName: "Ollama" | "LM Studio",
): boolean {
  const message = toError(value).message.toLowerCase();
  const provider = providerName.toLowerCase();
  return (
    message.includes(provider) ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("could not connect") ||
    message.includes("failed to fetch")
  );
}

export function getLocalModelConnectionError(
  providerName: "Ollama" | "LM Studio",
): Error {
  const serviceHint =
    providerName === "Ollama"
      ? "http://localhost:11434"
      : "the LM Studio local server";
  return new Error(
    `${providerName} is not running or is unreachable at ${serviceHint}.`,
  );
}
