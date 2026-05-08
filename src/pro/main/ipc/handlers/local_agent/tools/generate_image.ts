import { z } from "zod";
import { readSettings } from "@/main/settings";
import log from "electron-log";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  escapeXmlContent,
} from "./types";
import { DYAD_MEDIA_DIR_NAME } from "@/ipc/utils/media_path_utils";
import { ImageGenerationApiResponseSchema } from "@/ipc/types/image_generation";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const logger = log.scope("generate_image");

const generateImageSchema = z.object({
  prompt: z
    .string()
    .describe(
      "A detailed, descriptive prompt for the image to generate. Be specific about colors, composition, style, mood, and subject matter. Avoid generic or vague descriptions.",
    ),
});

const DESCRIPTION = `Generate an image using AI based on a text prompt. The generated image is saved to the project's .dyad/media directory.

### Supported Providers
- **OpenAI DALL-E 3** (Recommended): Configure an OpenAI API key in Settings > AI Providers > OpenAI
- **OpenRouter**: Configure an OpenRouter API key and set the image model to "openai/dall-e-3" in Settings > AI Providers > OpenRouter

### When to Use
- User requests a custom image, illustration, icon, or graphic for their app
- User wants a hero image, background, banner, or visual asset
- Creating images that are more visually relevant than placeholder rectangles

### Prompt Guidelines
Write detailed, descriptive prompts. Be specific about:
- **Subject**: What is in the image (objects, people, scenes)
- **Style**: Photography, illustration, flat design, 3D render, watercolor, etc.
- **Composition**: Layout, perspective, framing
- **Colors**: Specific color palette or mood
- **Mood**: Cheerful, professional, dramatic, minimal, etc.

### Examples
- "A modern flat illustration of a team collaborating around a laptop, using a blue and purple color palette, clean minimal style with subtle gradients, white background"
- "Professional product photography of a sleek smartphone on a marble surface, soft studio lighting, shallow depth of field, warm neutral tones"

### After Generation
The tool returns the file path in .dyad/media. Use the copy_file tool to copy it to the appropriate location in the project (e.g., public/assets/) and reference that path in your code.
`;

async function callGenerateImage(
  prompt: string,
  _ctx: Pick<AgentContext, "dyadRequestId">,
): Promise<z.infer<typeof ImageGenerationApiResponseSchema>["data"][number]> {
  const settings = readSettings();

  // Try OpenAI first if available, otherwise use OpenRouter
  const openaiApiKey = settings.providerSettings?.openai?.apiKey?.value;
  const openrouterApiKey = settings.providerSettings?.openrouter?.apiKey?.value;

  if (openaiApiKey) {
    // Use OpenAI's DALL-E for image generation
    logger.log("Using OpenAI DALL-E for image generation");

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `OpenAI image generation error: HTTP ${response.status}, Response: ${errorText}`,
      );
      throw new DyadError(
        `Génération d'image OpenAI échouée: ${response.status} ${response.statusText}`,
        DyadErrorKind.External,
      );
    }

    const data = ImageGenerationApiResponseSchema.parse(await response.json());

    if (!data.data || data.data.length === 0) {
      throw new DyadError(
        "OpenAI n'a retourné aucune image",
        DyadErrorKind.External,
      );
    }

    return data.data[0];
  }

  if (openrouterApiKey) {
    // Get the configured image model
    const imageModel =
      (settings.providerSettings?.openrouter as any)?.imageModel ||
      "google/gemini-2.5-flash-image";

    logger.log(
      `Using OpenRouter with model: ${imageModel} for image generation`,
    );

    // Use OpenRouter's chat completions endpoint with modalities parameter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterApiKey}`,
          "HTTP-Referer": "https://neurocode.app",
          "X-Title": "NeuroCode",
        },
        body: JSON.stringify({
          model: imageModel,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          modalities: ["image", "text"],
          stream: false,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `OpenRouter image generation error: HTTP ${response.status}, Response: ${errorText}`,
      );
      throw new DyadError(
        `Génération d'image via OpenRouter échouée: ${response.status} ${response.statusText}. Le modèle "${imageModel}" ne supporte peut-être pas la génération d'images. Essayez un modèle comme "google/gemini-2.5-flash-image" ou configurez une clé API OpenAI.`,
        DyadErrorKind.External,
      );
    }

    const data = await response.json();
    logger.log(
      `OpenRouter response received. Full response structure:`,
      JSON.stringify(data, null, 2).substring(0, 2000),
    );

    // Extract image from OpenRouter's chat completion response
    if (data.choices && data.choices[0]) {
      const message = data.choices[0].message;
      logger.log(
        `Message structure: ${JSON.stringify(message, null, 2).substring(0, 1000)}`,
      );

      // Check for images in the message
      if (message.images && message.images.length > 0) {
        const imageData = message.images[0];
        logger.log(
          `Found images array with ${message.images.length} image(s). First image structure: ${JSON.stringify(imageData, null, 2)}`,
        );
        const imageUrl = imageData.image_url?.url;

        if (imageUrl) {
          logger.log(`Found image URL: ${imageUrl.substring(0, 100)}...`);

          // Check if it's a base64 data URL or a regular URL
          if (imageUrl.startsWith("data:image/")) {
            // It's a base64 data URL, extract the base64 part
            const base64Match = imageUrl.match(
              /^data:image\/[^;]+;base64,(.+)$/,
            );
            if (base64Match) {
              logger.log(
                `Extracted base64 image data (${base64Match[1].length} chars)`,
              );
              return {
                b64_json: base64Match[1],
              };
            }
          }

          // It's a regular URL
          logger.log(`Using regular image URL`);
          return {
            url: imageUrl,
          };
        } else {
          logger.error(
            `image_url.url is missing in imageData: ${JSON.stringify(imageData)}`,
          );
        }
      } else {
        logger.error(
          `No images array found in message. Message keys: ${Object.keys(message).join(", ")}`,
        );
      }
    } else {
      logger.error(
        `No choices found in response. Response keys: ${Object.keys(data).join(", ")}`,
      );
    }

    logger.error(
      `Could not extract image from OpenRouter response. Full response: ${JSON.stringify(data).substring(0, 1000)}`,
    );
    throw new DyadError(
      `Le modèle "${imageModel}" n'a pas retourné d'image. Vérifiez que ce modèle supporte la génération d'images. Modèles recommandés: "google/gemini-2.5-flash-image", "black-forest-labs/flux.2-pro". Consultez les logs dans le terminal pour plus de détails.`,
      DyadErrorKind.External,
    );
  }

  throw new DyadError(
    "Aucune clé API configurée pour la génération d'images. Configurez une clé API OpenAI (recommandé) ou OpenRouter dans les paramètres (Paramètres > Fournisseurs d'IA).",
    DyadErrorKind.Auth,
  );
}

async function saveGeneratedImage(
  imageData: z.infer<typeof ImageGenerationApiResponseSchema>["data"][number],
  appPath: string,
): Promise<string> {
  const mediaDir = path.join(appPath, DYAD_MEDIA_DIR_NAME);
  await fs.mkdir(mediaDir, { recursive: true });

  const hash = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  const fileName = `generated-${timestamp}-${hash}.png`;
  const filePath = path.join(mediaDir, fileName);
  const relativePath = path.join(DYAD_MEDIA_DIR_NAME, fileName);

  if (imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, "base64");
    await fs.writeFile(filePath, buffer);
  } else if (imageData.url) {
    const response = await fetch(imageData.url);
    if (!response.ok) {
      throw new DyadError(
        `Failed to download generated image: ${response.status}`,
        DyadErrorKind.External,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  } else {
    throw new DyadError(
      "Image generation returned no image data",
      DyadErrorKind.External,
    );
  }

  return relativePath;
}

export const generateImageTool: ToolDefinition<
  z.infer<typeof generateImageSchema>
> = {
  name: "generate_image",
  description: DESCRIPTION,
  inputSchema: generateImageSchema,
  defaultConsent: "always",
  modifiesState: true,

  isEnabled: () => true,

  getConsentPreview: (args) => `Generate image: "${args.prompt}"`,

  buildXml: (args, isComplete) => {
    if (!args.prompt) return undefined;
    if (isComplete) return undefined;
    return `<dyad-image-generation prompt="${escapeXmlAttr(args.prompt)}">`;
  },

  execute: async (args, ctx: AgentContext) => {
    logger.log(`Executing image generation with prompt: ${args.prompt}`);

    ctx.onXmlStream(
      `<dyad-image-generation prompt="${escapeXmlAttr(args.prompt)}">`,
    );

    try {
      const imageData = await callGenerateImage(args.prompt, ctx);

      const relativePath = await saveGeneratedImage(imageData, ctx.appPath);

      ctx.onXmlComplete(
        `<dyad-image-generation prompt="${escapeXmlAttr(args.prompt)}" path="${escapeXmlAttr(relativePath)}">${escapeXmlContent(relativePath)}</dyad-image-generation>`,
      );

      logger.log(`Image generation completed, saved to: ${relativePath}`);

      return `Image generated and saved to: ${relativePath}\nUse the copy_file tool to copy it from "${relativePath}" to the appropriate location in the project (e.g., public/assets/), then reference the copied path in your code.`;
    } catch (error) {
      ctx.onXmlComplete(
        `<dyad-image-generation prompt="${escapeXmlAttr(args.prompt)}"></dyad-image-generation>`,
      );
      throw error;
    }
  },
};
