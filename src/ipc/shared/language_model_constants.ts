
export const PROVIDERS_THAT_SUPPORT_THINKING: (keyof typeof MODEL_OPTIONS)[] = [
  "google",
];

export interface ModelOption {
  name: string;
  displayName: string;
  description: string;
  dollarSigns?: number;
  temperature?: number;
  tag?: string;
  tagColor?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
}

export const GPT_5_2_MODEL_NAME = "gpt-5.2";
export const SONNET_4_6 = "claude-sonnet-4-6";
export const OPUS_4_6 = "claude-opus-4-6";
export const GEMINI_3_FLASH = "gemini-3-flash-preview";
export const GEMINI_3_1_PRO_PREVIEW = "gemini-3.1-pro-preview";
export const GPT_5_NANO = "gpt-5-nano";

export const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  openai: [
    // https://platform.openai.com/docs/models/gpt-5.1
    {
      name: GPT_5_2_MODEL_NAME,
      displayName: "GPT 5.2",
      description: "OpenAI's latest model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 3,
    },
    // https://platform.openai.com/docs/models/gpt-5.1
    {
      name: "gpt-5.1",
      displayName: "GPT 5.1",
      description:
        "OpenAI's flagship model- smarter, faster, and more conversational",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 3,
    },
    // https://platform.openai.com/docs/models/gpt-5.1-codex
    {
      name: "gpt-5.1-codex",
      displayName: "GPT 5.1 Codex",
      description: "OpenAI's advanced coding workflows",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 3,
    },
    // https://platform.openai.com/docs/models/gpt-5.1-codex-mini
    {
      name: "gpt-5.1-codex-mini",
      displayName: "GPT 5.1 Codex Mini",
      description: "OpenAI's compact and efficient coding model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 2,
    },

    // https://platform.openai.com/docs/models/gpt-5
    {
      name: "gpt-5",
      displayName: "GPT 5",
      description: "OpenAI's flagship model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 3,
    },
    // https://platform.openai.com/docs/models/gpt-5-codex
    {
      name: "gpt-5-codex",
      displayName: "GPT 5 Codex",
      description: "OpenAI's flagship model optimized for coding",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 3,
    },
    // https://platform.openai.com/docs/models/gpt-5-mini
    {
      name: "gpt-5-mini",
      displayName: "GPT 5 Mini",
      description: "OpenAI's lightweight, but intelligent model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
      dollarSigns: 2,
    },
  ],
  // https://docs.anthropic.com/en/docs/about-claude/models/all-models#model-comparison-table
  anthropic: [
    {
      name: "claude-opus-4-6",
      displayName: "Claude Opus 4.6",
      description:
        "Anthropic's best model for coding (note: this model is very expensive!)",
      // Set to 32k since context window is 1M tokens
      maxOutputTokens: 32_000,
      contextWindow: 1_000_000,
      temperature: 0,
      dollarSigns: 6,
    },
    // https://docs.anthropic.com/en/docs/about-claude/models/overview
    {
      name: SONNET_4_6,
      displayName: "Claude Sonnet 4.6",
      description:
        "Anthropic's fast and intelligent model (note: >200k tokens is very expensive!)",
      // Set to 32k since context window is 1M tokens
      maxOutputTokens: 32_000,
      contextWindow: 1_000_000,
      temperature: 0,
      dollarSigns: 5,
    },
    {
      name: "claude-opus-4-5",
      displayName: "Claude Opus 4.5",
      description:
        "Anthropic's best model for coding (note: this model is very expensive!)",
      // Set to 32k since context window is 1M tokens
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
      dollarSigns: 5,
    },
    {
      name: "claude-sonnet-4-5-20250929",
      displayName: "Claude Sonnet 4.5",
      description:
        "Anthropic's best model for coding (note: >200k tokens is very expensive!)",
      // Set to 32k since context window is 1M tokens
      maxOutputTokens: 32_000,
      contextWindow: 1_000_000,
      temperature: 0,
      dollarSigns: 5,
    },
    {
      name: "claude-sonnet-4-20250514",
      displayName: "Claude Sonnet 4",
      description: "Excellent coder (note: >200k tokens is very expensive!)",
      // Set to 32k since context window is 1M tokens
      maxOutputTokens: 32_000,
      contextWindow: 1_000_000,
      temperature: 0,
      dollarSigns: 5,
    },
  ],
  google: [
    // https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview
    {
      name: GEMINI_3_1_PRO_PREVIEW,
      displayName: "Gemini 3.1 Pro (Preview)",
      description: "Google's most capable Gemini model",
      // See Flash 2.5 comment below (go 1 below just to be safe, even though it seems OK now).
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      // Recommended by Google: https://ai.google.dev/gemini-api/docs/gemini-3?thinking=high#temperature
      temperature: 1.0,
      dollarSigns: 4,
    },
    // https://ai.google.dev/gemini-api/docs/models#gemini-3-pro
    {
      name: GEMINI_3_FLASH,
      displayName: "Gemini 3 Flash (Preview)",
      description: "Powerful coding model at a good price",
      // See Flash 2.5 comment below (go 1 below just to be safe, even though it seems OK now).
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      // Recommended by Google: https://ai.google.dev/gemini-api/docs/gemini-3?thinking=high#temperature
      temperature: 1.0,
      dollarSigns: 2,
    },
    // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro-preview-03-25
    {
      name: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      description: "Google's Gemini 2.5 Pro model",
      // See Flash 2.5 comment below (go 1 below just to be safe, even though it seems OK now).
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
      dollarSigns: 3,
    },
    // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview
    {
      name: "gemini-flash-latest",
      displayName: "Gemini 2.5 Flash",
      description: "Google's Gemini 2.5 Flash model (free tier available)",
      // Weirdly for Vertex AI, the output token limit is *exclusive* of the stated limit.
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
      dollarSigns: 2,
    },
  ],

  openrouter: [
    {
      name: "openrouter/free",
      displayName: "Free (OpenRouter)",
      description:
        "Uses one of the free OpenRouter models (data may be used for training)",
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
      dollarSigns: 0,
    },

    // https://openrouter.ai/moonshotai/kimi-k2.5
    {
      name: "moonshotai/kimi-k2.5",
      displayName: "Kimi K2.5",
      description: "Moonshot AI's latest and most capable model",
      maxOutputTokens: 32_000,
      contextWindow: 256_000,
      temperature: 1.0,
      dollarSigns: 2,
    },
    {
      name: "openai/gpt-oss-120b:free",
      displayName: "OpenAI GPT OSS 120B",
      description: "OpenAI's capable model via OpenRouter",
      dollarSigns: 1,
      temperature: 0,
      maxOutputTokens: 32_000,
      contextWindow: 256_000,
    },
    // https://openrouter.ai/mistralai/mistral-small-2603
    {
      name: "mistralai/mistral-small-2603",
      displayName: "Mistral Small 2603",
      description: "Mistral AI's latest small model via OpenRouter",
      dollarSigns: 2,
      temperature: 0,
      maxOutputTokens: 32_000,
      contextWindow: 256_000,
    },
    // https://openrouter.ai/deepseek/deepseek-v4-flash
    {
      name: "deepseek/deepseek-v4-flash",
      displayName: "DeepSeek V4 Flash",
      description:
        "DeepSeek's capable model for coding workflows via OpenRouter",
      dollarSigns: 1,
      temperature: 0,
      maxOutputTokens: 131_072,
      contextWindow: 1_048_576,
    },
    // https://openrouter.ai/minimax/minimax-m2.7
    {
      name: "minimax/minimax-m2.7",
      displayName: "MiniMax M2.7",
      description: "Latest flagship model with enhanced reasoning and coding",
      maxOutputTokens: 32_000,
      contextWindow: 204_800,
      temperature: 0,
      dollarSigns: 1,
    },
    // https://openrouter.ai/minimax/minimax-m2.5
    {
      name: "minimax/minimax-m2.5",
      displayName: "MiniMax M2.5",
      description: "Strong cost-effective model for real-world productivity",
      maxOutputTokens: 32_000,
      contextWindow: 196_608,
      temperature: 0,
      dollarSigns: 1,
    },
    {
      name: "z-ai/glm-5",
      displayName: "GLM 5",
      description: "Z-AI's best coding model",
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0.7,
      dollarSigns: 2,
    },
    {
      name: "z-ai/glm-4.7",
      displayName: "GLM 4.7",
      description: "Z-AI's coding model",
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0.7,
      dollarSigns: 2,
    },
    {
      name: "qwen/qwen3-coder",
      displayName: "Qwen3 Coder",
      description: "Qwen's best coding model",
      maxOutputTokens: 32_000,
      contextWindow: 262_000,
      temperature: 0,
      dollarSigns: 2,
    },
    {
      name: "deepseek/deepseek-chat-v3.1",
      displayName: "DeepSeek v3.1",
      description: "Strong cost-effective model with optional thinking",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
      dollarSigns: 2,
    },
  ],
  auto: [
    {
      name: "auto",
      displayName: "Auto",
      description: "Automatically selects the best model",
      tag: "Default",
      // The following is reasonable defaults.
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "free",
      displayName: "Free (OpenRouter)",
      description: "Selects from one of the free OpenRouter models",
      tag: "Free",
      // These are below Gemini 2.5 Pro & Flash limits
      // which are the ones defaulted to for both regular auto
      // and smart auto.
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
    },
  ],
};

export const FREE_OPENROUTER_MODEL_NAMES = MODEL_OPTIONS.openrouter
  .filter(
    (model) => model.name.endsWith(":free") || model.name.endsWith("/free"),
  )
  .map((model) => model.name);

export const PROVIDER_TO_ENV_VAR: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export const CLOUD_PROVIDERS: Record<
  string,
  {
    displayName: string;
    hasFreeTier?: boolean;
    websiteUrl?: string;
    gatewayPrefix: string;
    secondary?: boolean;
  }
> = {
  openai: {
    displayName: "OpenAI",
    hasFreeTier: false,
    websiteUrl: "https://platform.openai.com/api-keys",
    gatewayPrefix: "",
  },
  anthropic: {
    displayName: "Anthropic",
    hasFreeTier: false,
    websiteUrl: "https://console.anthropic.com/settings/keys",
    gatewayPrefix: "anthropic/",
  },
  google: {
    displayName: "Google",
    hasFreeTier: true,
    websiteUrl: "https://aistudio.google.com/app/apikey",
    gatewayPrefix: "gemini/",
  },

  openrouter: {
    displayName: "OpenRouter",
    hasFreeTier: true,
    websiteUrl: "https://openrouter.ai/settings/keys",
    gatewayPrefix: "openrouter/",
  },
  auto: {
    displayName: "Dyad",
    websiteUrl: "https://academy.dyad.sh/subscription",
    gatewayPrefix: "dyad/",
  },
};

export const LOCAL_PROVIDERS: Record<
  string,
  {
    displayName: string;
    hasFreeTier: boolean;
  }
> = {
  ollama: {
    displayName: "Ollama",
    hasFreeTier: true,
  },
  lmstudio: {
    displayName: "LM Studio",
    hasFreeTier: true,
  },
};
