/**
 * Codebase Export Button Component
 * Allows users to export the entire codebase to a single Markdown file
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useExportCodebase } from "@/renderer/hooks/useCodebaseExport";
import { showSuccess, showError } from "@/lib/toast";

interface CodebaseExportButtonProps {
  appId: number;
  className?: string;
}

export function CodebaseExportButton({
  appId,
  className,
}: CodebaseExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [includeTests, setIncludeTests] = useState(false);
  const [includeDotFiles, setIncludeDotFiles] = useState(false);

  const exportMutation = useExportCodebase();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        appId,
        includeTests,
        includeDotFiles,
        maxFileSize: 1024 * 1024, // 1MB per file
      });

      if (result.success) {
        showSuccess(
          `✅ Export réussi: ${result.filesIncluded} fichiers exportés (${(result.fileSize / 1024).toFixed(2)} KB)`,
        );

        // Open file location using the proper IPC method
        (window as any).electron.ipcRenderer.invoke("shell:showItemInFolder", {
          path: result.filePath,
        });

        setOpen(false);
      }
    } catch (error) {
      showError(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div
          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-11 rounded-md px-8 ${className}`}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Exporter pour LLM
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exporter la Codebase</DialogTitle>
          <DialogDescription>
            Générer un fichier Markdown unique contenant toute la codebase,
            optimisé pour les LLM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeTests"
                checked={includeTests}
                onCheckedChange={(checked) =>
                  setIncludeTests(checked as boolean)
                }
              />
              <Label
                htmlFor="includeTests"
                className="text-sm font-normal cursor-pointer"
              >
                Inclure les fichiers de tests
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDotFiles"
                checked={includeDotFiles}
                onCheckedChange={(checked) =>
                  setIncludeDotFiles(checked as boolean)
                }
              />
              <Label
                htmlFor="includeDotFiles"
                className="text-sm font-normal cursor-pointer"
              >
                Inclure les fichiers cachés (.env.example, .gitignore, etc.)
              </Label>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">📋 Ce qui sera inclus :</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Tous les fichiers de code source</li>
              <li>Fichiers de configuration</li>
              <li>Documentation (README, etc.)</li>
              <li>Structure de dossiers</li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">🚫 Ce qui sera exclu :</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>node_modules/</li>
              <li>.git/</li>
              <li>dist/, build/</li>
              <li>Fichiers binaires</li>
              <li>Fichiers &gt; 1MB</li>
            </ul>
          </div>

          {/* Status */}
          {exportMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Export en cours...</span>
            </div>
          )}

          {exportMutation.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Export terminé avec succès !</span>
            </div>
          )}

          {exportMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>
                Erreur :{" "}
                {exportMutation.error instanceof Error
                  ? exportMutation.error.message
                  : "Erreur inconnue"}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exportMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="gap-2"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Export...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Exporter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
