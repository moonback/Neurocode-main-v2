import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Sparkles, Link } from "lucide-react";
import {
  useGenerateThemePrompt,
  useGenerateThemeFromUrl,
  useThemeGenerationModelOptions,
} from "@/hooks/useCustomThemes";
import { ipc } from "@/ipc/types";
import { showError } from "@/lib/toast";
import { toast } from "sonner";
import { useUserBudgetInfo } from "@/hooks/useUserBudgetInfo";

import type {
  ThemeGenerationMode,
  ThemeGenerationModel,
  ThemeInputSource,
} from "@/ipc/types";

// Image upload constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image (raw file size)
const MAX_IMAGES = 5;

// Image stored with file path (for IPC) and blob URL (for preview)
interface ThemeImage {
  path: string; // File path in temp directory
  preview: string; // Blob URL for displaying thumbnail
}

interface AIGeneratorTabProps {
  aiName: string;
  setAiName: (name: string) => void;
  aiDescription: string;
  setAiDescription: (desc: string) => void;
  aiGeneratedPrompt: string;
  setAiGeneratedPrompt: (prompt: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isDialogOpen: boolean;
}

export function AIGeneratorTab({
  aiName,
  setAiName,
  aiDescription,
  setAiDescription,
  aiGeneratedPrompt,
  setAiGeneratedPrompt,
  onSave,
  isSaving,
  isDialogOpen,
}: AIGeneratorTabProps) {
  const [aiImages, setAiImages] = useState<ThemeImage[]>([]);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiGenerationMode, setAiGenerationMode] =
    useState<ThemeGenerationMode>("inspired");
  const [aiSelectedModel, setAiSelectedModel] =
    useState<ThemeGenerationModel>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track if dialog is open to prevent orphaned uploads from adding images after close
  const isDialogOpenRef = useRef(isDialogOpen);

  // URL-based generation state
  const [inputSource, setInputSource] = useState<ThemeInputSource>("images");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const generatePromptMutation = useGenerateThemePrompt();
  const generateFromUrlMutation = useGenerateThemeFromUrl();
  const isGenerating =
    generatePromptMutation.isPending || generateFromUrlMutation.isPending;
  useUserBudgetInfo();
  const { themeGenerationModelOptions, isLoadingThemeGenerationModelOptions } =
    useThemeGenerationModelOptions();

  // Cleanup function to revoke blob URLs and delete temp files
  const cleanupImages = useCallback(
    async (images: ThemeImage[], showErrors = false) => {
      // Revoke blob URLs to free memory
      images.forEach((img) => {
        URL.revokeObjectURL(img.preview);
      });

      // Delete temp files via IPC
      const paths = images.map((img) => img.path);
      if (paths.length > 0) {
        try {
          await ipc.template.cleanupThemeImages({ paths });
        } catch {
          if (showErrors) {
            showError("Failed to cleanup temporary image files");
          }
        }
      }
    },
    [],
  );

  // Keep ref in sync with isDialogOpen prop
  useEffect(() => {
    isDialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen]);

  useEffect(() => {
    const firstModelId = themeGenerationModelOptions[0]?.id ?? "";
    if (!firstModelId) {
      return;
    }

    if (
      !aiSelectedModel ||
      !themeGenerationModelOptions.some((model) => model.id === aiSelectedModel)
    ) {
      setAiSelectedModel(firstModelId);
    }
  }, [aiSelectedModel, themeGenerationModelOptions]);

  // Keep a ref to current images for cleanup without causing effect re-runs
  const aiImagesRef = useRef<ThemeImage[]>([]);
  useEffect(() => {
    aiImagesRef.current = aiImages;
  }, [aiImages]);

  // Cleanup images and reset state when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      // Use ref to get current images to avoid dependency on aiImages
      const imagesToCleanup = aiImagesRef.current;
      if (imagesToCleanup.length > 0) {
        cleanupImages(imagesToCleanup);
        setAiImages([]);
      }
      setAiKeywords("");
      setAiGenerationMode("inspired");
      setAiSelectedModel(themeGenerationModelOptions[0]?.id ?? "");
      setInputSource("images");
      setWebsiteUrl("");
    }
  }, [isDialogOpen, cleanupImages, themeGenerationModelOptions]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const availableSlots = MAX_IMAGES - aiImages.length;
      if (availableSlots <= 0) {
        showError(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      const filesToProcess = Array.from(files).slice(0, availableSlots);
      const skippedCount = files.length - filesToProcess.length;

      if (skippedCount > 0) {
        showError(
          `Seules ${availableSlots} image${availableSlots === 1 ? "" : "s"} peuvent être ajoutées. ${skippedCount} fichier${skippedCount === 1 ? " a été" : " ont été"} ignoré(s).`,
        );
      }

      setIsUploading(true);

      try {
        const newImages: ThemeImage[] = [];

        for (const file of filesToProcess) {
          // Validate file type
          if (!file.type.startsWith("image/")) {
            showError(
              `Veuillez télécharger uniquement des images. "${file.name}" n'est pas une image valide.`,
            );
            continue;
          }

          // Validate file size (raw file size)
          if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            showError(`File "${file.name}" exceeds 10MB limit (${sizeMB}MB)`);
            continue;
          }

          try {
            // Read file as base64 for upload
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("Failed to read file"));
              reader.onload = () => {
                const base64 = reader.result as string;
                const data = base64.split(",")[1];
                if (!data) {
                  reject(new Error("Failed to extract image data"));
                  return;
                }
                resolve(data);
              };
              reader.readAsDataURL(file);
            });

            // Save to temp file via IPC
            const result = await ipc.template.saveThemeImage({
              data: base64Data,
              filename: file.name,
            });

            // Create blob URL for preview (much more memory efficient than base64 in DOM)
            const preview = URL.createObjectURL(file);

            newImages.push({
              path: result.path,
              preview,
            });
          } catch (err) {
            showError(
              `Error processing "${file.name}": ${err instanceof Error ? err.message : "Unknown error"}`,
            );
          }
        }

        if (newImages.length > 0) {
          // Check if dialog was closed while upload was in progress
          if (!isDialogOpenRef.current) {
            // Dialog closed - cleanup orphaned images immediately
            await cleanupImages(newImages);
            return;
          }

          setAiImages((prev) => {
            // Double-check limit in case of race conditions
            const remaining = MAX_IMAGES - prev.length;
            return [...prev, ...newImages.slice(0, remaining)];
          });
        }
      } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [aiImages.length, cleanupImages],
  );

  const handleRemoveImage = useCallback(
    async (index: number) => {
      const imageToRemove = aiImages[index];
      if (imageToRemove) {
        // Cleanup the removed image - show errors since this is a user action
        await cleanupImages([imageToRemove], true);
      }
      setAiImages((prev) => prev.filter((_, i) => i !== index));
    },
    [aiImages, cleanupImages],
  );

  const handleGenerate = useCallback(async () => {
    if (inputSource === "images") {
      // Image-based generation
      if (aiImages.length === 0) {
        showError("Veuillez importer au moins une image");
        return;
      }

      try {
        const result = await generatePromptMutation.mutateAsync({
          imagePaths: aiImages.map((img) => img.path),
          keywords: aiKeywords,
          generationMode: aiGenerationMode,
          model: aiSelectedModel,
        });
        setAiGeneratedPrompt(result.prompt);
        toast.success("Prompt généré avec succès");
      } catch (error) {
        showError(
          `Échec de la génération du prompt : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        );
      }
    } else {
      // URL-based generation
      if (!websiteUrl.trim()) {
        showError("Veuillez entrer l'URL d'un site web");
        return;
      }

      try {
        const result = await generateFromUrlMutation.mutateAsync({
          url: websiteUrl,
          keywords: aiKeywords,
          generationMode: aiGenerationMode,
          model: aiSelectedModel,
        });

        setAiGeneratedPrompt(result.prompt);
        toast.success("Prompt généré avec succès");
      } catch (error) {
        showError(
          `Échec de la génération du prompt : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        );
      }
    }
  }, [
    inputSource,
    aiImages,
    websiteUrl,
    aiKeywords,
    aiGenerationMode,
    aiSelectedModel,
    generatePromptMutation,
    generateFromUrlMutation,
    setAiGeneratedPrompt,
  ]);



  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="ai-name">Nom du thème</Label>
        <Input
          id="ai-name"
          placeholder="Nom du thème généré par l'IA"
          value={aiName}
          onChange={(e) => setAiName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-description">Description (optionnel)</Label>
        <Input
          id="ai-description"
          placeholder="Description brève du thème"
          value={aiDescription}
          onChange={(e) => setAiDescription(e.target.value)}
        />
      </div>

      {/* Input Source Toggle */}
      <div className="space-y-3">
        <Label>Source de référence</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setInputSource("images")}
            className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${inputSource === "images"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
              }`}
          >
            <Upload className="h-5 w-5 mb-1" />
            <span className="font-medium text-sm">Importer des images</span>
            <span className="text-xs text-muted-foreground mt-1">
              Utiliser des captures d'écran de votre appareil
            </span>
          </button>
          <button
            type="button"
            onClick={() => setInputSource("url")}
            className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${inputSource === "url"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
              }`}
          >
            <Link className="h-5 w-5 mb-1" />
            <span className="font-medium text-sm">URL de site web</span>
            <span className="text-xs text-muted-foreground mt-1">
              Extraire le design d'un site web en direct
            </span>
          </button>
        </div>
      </div>

      {/* Image Upload Section - only shown when inputSource is "images" */}
      {inputSource === "images" && (
        <div className="space-y-2">
          <Label>Images de référence</Label>
          <div
            className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              {isUploading ? "En cours..." : "Cliquez pour importer des images"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Importez des captures d'écran pour inspirer votre thème
            </p>
          </div>

          {/* Image counter */}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {aiImages.length} / {MAX_IMAGES} images
            {aiImages.length >= MAX_IMAGES && (
              <span className="text-destructive ml-2">• Maximum atteint</span>
            )}
          </p>

          {/* Image Preview */}
          {aiImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {aiImages.map((img, index) => (
                <div key={img.path} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Upload ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-md border"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* URL Input Section - only shown when inputSource is "url" */}
      {inputSource === "url" && (
        <div className="space-y-2">
          <Label htmlFor="website-url">URL du site web</Label>
          <Input
            id="website-url"
            type="url"
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            Entrez l'URL d'un site web pour extraire son système de design
          </p>
        </div>
      )}

      {/* Keywords Input */}
      <div className="space-y-2">
        <Label htmlFor="ai-keywords">Mots-clés (optionnel)</Label>
        <Input
          id="ai-keywords"
          placeholder="modern, minimal, dark mode, glassmorphism..."
          value={aiKeywords}
          onChange={(e) => setAiKeywords(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Ajoutez des mots-clés ou des designs de référence pour guider la
          génération
        </p>
      </div>

      {/* Generation Mode Selection */}
      <div className="space-y-3">
        <Label>Mode de génération</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAiGenerationMode("inspired")}
            className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${aiGenerationMode === "inspired"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
              }`}
          >
            <span className="font-medium">Inspiré</span>
            <span className="text-xs text-muted-foreground mt-1">
              Extrait un système de design abstrait et réutilisable. Ne
              reproduit pas l'interface d'origine.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAiGenerationMode("high-fidelity")}
            className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${aiGenerationMode === "high-fidelity"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
              }`}
          >
            <span className="font-medium">Fidélité élevée</span>
            <span className="text-xs text-muted-foreground mt-1">
              Recreate le système visuel de l'image le plus fidèlement possible.
            </span>
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <Label>Sélection du modèle</Label>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3"
          role="radiogroup"
          aria-label="Sélection du modèle"
        >
          {isLoadingThemeGenerationModelOptions ? (
            <div className="col-span-full flex items-center justify-center py-3 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement des modèles...
            </div>
          ) : themeGenerationModelOptions.length === 0 ? (
            <div className="col-span-full text-center py-3 text-sm text-muted-foreground">
              Aucun modèle disponible
            </div>
          ) : (
            themeGenerationModelOptions.map((modelOption) => (
              <button
                key={modelOption.id}
                type="button"
                role="radio"
                aria-checked={aiSelectedModel === modelOption.id}
                onClick={() => setAiSelectedModel(modelOption.id)}
                className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${aiSelectedModel === modelOption.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
                  }`}
              >
                <span className="font-medium text-sm">{modelOption.label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={
          isLoadingThemeGenerationModelOptions ||
          !aiSelectedModel ||
          isGenerating ||
          (inputSource === "images" && aiImages.length === 0) ||
          (inputSource === "url" && !websiteUrl.trim())
        }
        variant="secondary"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {inputSource === "url"
              ? "Génération du prompt à partir du site web..."
              : "Génération du prompt..."}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Générer le Prompt du Thème
          </>
        )}
      </Button>

      {/* Generated Prompt Display */}
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Prompt du thème généré</Label>
        {aiGeneratedPrompt ? (
          <Textarea
            id="ai-prompt"
            className="min-h-[200px] font-mono text-sm"
            value={aiGeneratedPrompt}
            onChange={(e) => setAiGeneratedPrompt(e.target.value)}
            placeholder="Le prompt du thème généré apparaîtra ici..."
          />
        ) : (
          <div className="min-h-[100px] border rounded-md p-4 flex items-center justify-center text-muted-foreground text-sm text-center">
            Aucun prompt généré pour le moment.{" "}
            {inputSource === "images"
              ? 'Téléchargez des images et cliquez sur "Générer" pour créer un prompt de thème.'
              : 'Entrez l\'URL d\'un site web et cliquez sur "Générer" pour extraire un thème.'}
          </div>
        )}
      </div>

      {/* Save Button - only show when prompt is generated */}
      {aiGeneratedPrompt && (
        <Button
          onClick={onSave}
          disabled={isSaving || !aiName.trim()}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer le Thème"
          )}
        </Button>
      )}
    </div>
  );
}
