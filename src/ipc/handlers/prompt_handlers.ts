import log from "electron-log";
import { db } from "@/db";
import { prompts, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTypedHandler } from "./base";
import { promptContracts } from "../types/prompts";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { readSettings } from "@/main/settings";
import { getModelClient } from "../utils/get_model_client";
import { generateText } from "ai";

const _logger = log.scope("prompt_handlers");

export function registerPromptHandlers() {
  createTypedHandler(promptContracts.list, async () => {
    const rows = db.select().from(prompts).all();
    return rows.map((r) => ({
      id: r.id!,
      title: r.title,
      description: r.description,
      content: r.content,
      slug: r.slug,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  });

  createTypedHandler(promptContracts.create, async (_, params) => {
    const { title, content, description, slug } = params;
    if (!title || !content) {
      throw new DyadError(
        "Title and content are required",
        DyadErrorKind.External,
      );
    }
    const result = db
      .insert(prompts)
      .values({
        title,
        description,
        content,
        slug: slug ?? null,
      })
      .run();

    const id = Number(result.lastInsertRowid);
    const row = db.select().from(prompts).where(eq(prompts.id, id)).get();
    if (!row) throw new Error("Failed to fetch created prompt");
    return {
      id: row.id!,
      title: row.title,
      description: row.description,
      content: row.content,
      slug: row.slug,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  createTypedHandler(promptContracts.update, async (_, params) => {
    const { id, title, content, description, slug } = params;
    if (!id) throw new Error("Prompt id is required");
    const now = new Date();
    const updateData: Record<string, any> = { updatedAt: now };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (description !== undefined) updateData.description = description;
    if (slug !== undefined) updateData.slug = slug ?? null;
    db.update(prompts).set(updateData).where(eq(prompts.id, id)).run();
  });

  createTypedHandler(promptContracts.delete, async (_, id) => {
    if (!id) throw new Error("Prompt id is required");
    db.delete(prompts).where(eq(prompts.id, id)).run();
  });

  createTypedHandler(promptContracts.optimize, async (_, params) => {
    const { prompt, context } = params;
    if (!prompt || prompt.trim().length === 0) {
      throw new DyadError(
        "Prompt is required for optimization",
        DyadErrorKind.External,
      );
    }

    const settings = await readSettings();
    if (!settings) {
      throw new DyadError("Settings not found", DyadErrorKind.NotFound);
    }

    try {
      const { modelClient } = await getModelClient(
        settings.selectedModel,
        settings,
      );

      const systemPrompt = `You are an expert at optimizing prompts for AI assistants. Your task is to improve the user's prompt to make it clearer, more specific, and more effective.

Guidelines for optimization:
- Make the prompt more specific and actionable
- Add relevant context if missing
- Break down complex requests into clear steps
- Use precise technical language when appropriate
- Maintain the user's original intent
- Keep it concise but comprehensive
- Add constraints or requirements that would help get better results

Return ONLY the optimized prompt without any explanations or meta-commentary.`;

      const userMessage = context
        ? `Original prompt: "${prompt}"\n\nAdditional context: ${context}\n\nOptimize this prompt:`
        : `Original prompt: "${prompt}"\n\nOptimize this prompt:`;

      const result = await generateText({
        model: modelClient.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      });

      return result.text.trim();
    } catch (error) {
      _logger.error("Error optimizing prompt:", error);
      throw new DyadError(
        `Failed to optimize prompt: ${(error as Error).message}`,
        DyadErrorKind.External,
      );
    }
  });
  createTypedHandler(promptContracts.generateSuggestions, async (_, params) => {
    const { chatId } = params;
    if (!chatId) {
      throw new DyadError("Chat ID is required", DyadErrorKind.External);
    }

    const settings = await readSettings();
    if (!settings) {
      throw new DyadError("Settings not found", DyadErrorKind.NotFound);
    }

    try {
      // Fetch chat messages for context
      const chatMessages = db
        .select()
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(messages.id)
        .all();

      const lastMessagesContext = chatMessages
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n\n");

      const { modelClient } = await getModelClient(
        settings.selectedModel,
        settings,
      );

      const systemPrompt = `Tu es un expert en développement logiciel et en analyse de produits.
Ta tâche est de générer des suggestions pertinentes pour améliorer le projet actuel de l'utilisateur en te basant sur l'historique du chat.

Génère 4 suggestions uniques, une pour chaque catégorie suivante :
1. "feature" : Une nouvelle fonctionnalité utile.
2. "fix" : Une correction de bug potentiel ou une amélioration de la robustesse.
3. "optimize" : Une optimisation de performance ou de structure de code.
4. "improve" : Une amélioration de l'UX, du design ou de l'accessibilité.

Chaque suggestion doit être concrète et directement liée à ce que l'utilisateur construit.

RETOURNE UNIQUEMENT UN TABLEAU JSON au format suivant (sans texte avant ou après) :
[
  {
    "id": "identifiant-unique",
    "label": "Titre court de la suggestion",
    "prompt": "Le prompt détaillé à envoyer à l'IA pour implémenter cette suggestion",
    "category": "feature | fix | optimize | improve"
  }
]

Assure-toi que les prompts sont en français et très instructifs.`;

      const result = await generateText({
        model: modelClient.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Voici l'historique récent du projet :\n\n${lastMessagesContext}\n\nGénère des suggestions pertinentes pour ce projet.` },
        ],
        temperature: 0.8,
      });

      const cleanedText = result.text.trim().replace(/^```json/, "").replace(/```$/, "");
      try {
        return JSON.parse(cleanedText);
      } catch {
        _logger.error("Error parsing AI suggestions JSON:", cleanedText);
        throw new Error("Failed to parse AI suggestions");
      }
    } catch (error) {
      _logger.error("Error generating suggestions:", error);
      throw new DyadError(
        `Failed to generate suggestions: ${(error as Error).message}`,
        DyadErrorKind.External,
      );
    }
  });
}
