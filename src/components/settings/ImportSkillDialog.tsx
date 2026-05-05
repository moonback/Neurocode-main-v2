import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Loader2,
} from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { ipc } from "@/ipc/types";

interface ImportSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillImported?: () => void;
}

interface ParsedSkill {
  name: string;
  description: string;
  content: string;
  fileName: string;
  additionalFiles?: Array<{ relativePath: string; content: string }>;
  isComplex?: boolean; // Has additional files beyond SKILL.md
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ fileName: string; error: string }>;
}

export function ImportSkillDialog({
  isOpen,
  onClose,
  onSkillImported,
}: ImportSkillDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parsedSkills, setParsedSkills] = useState<ParsedSkill[]>([]);
  const [scope, setScope] = useState<"user" | "workspace">("user");
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ fileName: string; error: string }>
  >([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setValidationErrors([]);
    setParsedSkills([]);
    setImportResult(null);

    try {
      const allSkillFiles: Array<{
        skillMd: File;
        otherFiles: File[];
        skillName: string;
      }> = [];

      // Process each selected file
      for (const file of files) {
        if (file.name.endsWith(".zip")) {
          // Extract skills from ZIP
          const skillsMap = await extractZipFile(file);
          for (const [skillName, files] of skillsMap.entries()) {
            allSkillFiles.push({
              skillMd: files.skillMd,
              otherFiles: files.otherFiles,
              skillName,
            });
          }
        } else if (file.name.endsWith(".md")) {
          // Single .md file
          allSkillFiles.push({
            skillMd: file,
            otherFiles: [],
            skillName: file.name.replace(/\.md$/i, ""),
          });
        } else {
          showError(
            `Fichier ignoré : ${file.name} (seuls .md et .zip sont acceptés)`,
          );
        }
      }

      if (allSkillFiles.length === 0) {
        showError("Aucun fichier valide trouvé");
        setIsProcessing(false);
        return;
      }

      setSelectedFiles(allSkillFiles.map((s) => s.skillMd));

      // Validate and parse all skills
      const parsed: ParsedSkill[] = [];
      const errors: Array<{ fileName: string; error: string }> = [];

      for (const skillFiles of allSkillFiles) {
        try {
          const content = await skillFiles.skillMd.text();
          const validation = await ipc.skills.validate(content);

          if (!validation.valid) {
            const errorMessages = validation.errors
              .map((e) => e.message)
              .join(", ");
            errors.push({
              fileName: skillFiles.skillMd.name,
              error: errorMessages,
            });
            continue;
          }

          // Parse frontmatter
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (!frontmatterMatch) {
            errors.push({
              fileName: skillFiles.skillMd.name,
              error: "Frontmatter YAML manquant",
            });
            continue;
          }

          const frontmatter = frontmatterMatch[1];
          const nameMatch = frontmatter.match(/name:\s*(.+)/);
          const descriptionMatch = frontmatter.match(/description:\s*(.+)/);

          if (!nameMatch) {
            errors.push({
              fileName: skillFiles.skillMd.name,
              error: "Le champ 'name' est manquant dans le frontmatter",
            });
            continue;
          }

          const name = nameMatch[1].trim();
          const description = descriptionMatch
            ? descriptionMatch[1].trim()
            : "";

          // Extract content after frontmatter
          const contentAfterFrontmatter = content
            .replace(/^---\n[\s\S]*?\n---\n/, "")
            .trim();

          // Process additional files
          const additionalFiles: Array<{
            relativePath: string;
            content: string;
          }> = [];

          for (const otherFile of skillFiles.otherFiles) {
            const fileContent = await otherFile.text();
            additionalFiles.push({
              relativePath: otherFile.name,
              content: fileContent,
            });
          }

          parsed.push({
            name,
            description,
            content: contentAfterFrontmatter,
            fileName: skillFiles.skillMd.name,
            additionalFiles:
              additionalFiles.length > 0 ? additionalFiles : undefined,
            isComplex: additionalFiles.length > 0,
          });
        } catch (error) {
          errors.push({
            fileName: skillFiles.skillMd.name,
            error:
              error instanceof Error
                ? error.message
                : "Erreur lors de la lecture",
          });
        }
      }

      setParsedSkills(parsed);
      setValidationErrors(errors);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Erreur lors du traitement des fichiers",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const extractZipFile = async (
    zipFile: File,
  ): Promise<Map<string, { skillMd: File; otherFiles: File[] }>> => {
    // Dynamic import of JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    try {
      const zipContent = await zip.loadAsync(zipFile);
      const skillsMap = new Map<
        string,
        { skillMd: File | null; otherFiles: File[] }
      >();

      // Extract all files from the ZIP
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir) continue;

        const content = await zipEntry.async("text");

        // Determine if this is a SKILL.md file
        const pathParts = relativePath.split("/");
        const fileName = pathParts[pathParts.length - 1];

        if (fileName === "SKILL.md" || fileName.toUpperCase() === "SKILL.MD") {
          // This is a main skill file
          // The skill name is the parent directory
          const skillName =
            pathParts.length > 1 ? pathParts[pathParts.length - 2] : "skill";

          if (!skillsMap.has(skillName)) {
            skillsMap.set(skillName, { skillMd: null, otherFiles: [] });
          }

          const file = new File([content], relativePath, {
            type: "text/markdown",
          });
          skillsMap.get(skillName)!.skillMd = file;
        } else {
          // This is an additional file
          // Find which skill it belongs to by looking for SKILL.md in parent dirs
          let skillName = "skill";
          for (let i = pathParts.length - 1; i >= 0; i--) {
            const testPath = [...pathParts.slice(0, i), "SKILL.md"].join("/");
            if (zipContent.files[testPath]) {
              skillName = pathParts[i - 1] || "skill";
              break;
            }
          }

          if (!skillsMap.has(skillName)) {
            skillsMap.set(skillName, { skillMd: null, otherFiles: [] });
          }

          // Calculate relative path from skill root
          const skillIndex = pathParts.findIndex((p) => p === skillName);
          const relativeFromSkill =
            skillIndex >= 0
              ? pathParts.slice(skillIndex + 1).join("/")
              : relativePath;

          const file = new File([content], relativeFromSkill, {
            type: "text/plain",
          });
          skillsMap.get(skillName)!.otherFiles.push(file);
        }
      }

      // Filter out skills without SKILL.md
      const validSkills = new Map<
        string,
        { skillMd: File; otherFiles: File[] }
      >();
      for (const [skillName, files] of skillsMap.entries()) {
        if (files.skillMd) {
          validSkills.set(skillName, {
            skillMd: files.skillMd,
            otherFiles: files.otherFiles,
          });
        }
      }

      return validSkills;
    } catch (error) {
      throw new Error(
        `Erreur lors de l'extraction du ZIP : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  };

  const handleImport = async () => {
    if (parsedSkills.length === 0) return;

    setIsImporting(true);
    setImportResult(null);

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const skill of parsedSkills) {
      try {
        if (skill.additionalFiles && skill.additionalFiles.length > 0) {
          // Use importWithFiles for complex skills
          await ipc.skills.importWithFiles({
            name: skill.name,
            description: skill.description,
            content: skill.content,
            scope,
            additionalFiles: skill.additionalFiles,
          });
        } else {
          // Use regular create for simple skills
          await ipc.skills.create({
            name: skill.name,
            description: skill.description,
            content: skill.content,
            scope,
          });
        }
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          fileName: skill.fileName,
          error:
            error instanceof Error
              ? error.message
              : "Erreur lors de l'importation",
        });
      }
    }

    setImportResult({
      success: successCount,
      failed: failedCount,
      errors,
    });

    setIsImporting(false);

    if (successCount > 0) {
      const message =
        successCount === 1
          ? `1 skill importé avec succès`
          : `${successCount} skills importés avec succès`;
      showSuccess(message);

      if (failedCount === 0) {
        // All succeeded, close dialog
        setTimeout(() => {
          handleClose();
          onSkillImported?.();
        }, 1500);
      } else {
        // Some failed, keep dialog open to show errors
        onSkillImported?.();
      }
    } else {
      showError("Aucun skill n'a pu être importé");
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setParsedSkills([]);
    setScope("user");
    setValidationErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Importer un skill
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File selection */}
          <div>
            <Label>Fichiers Skills (.md ou .zip)</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.zip"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBrowseClick}
                  variant="outline"
                  className="flex items-center gap-2"
                  type="button"
                  disabled={isProcessing || isImporting}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Parcourir
                    </>
                  )}
                </Button>
                {selectedFiles.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedFiles.some((f) => f.name.endsWith(".zip")) ? (
                      <>
                        <FileArchive size={16} />
                        <span>
                          {selectedFiles.length} fichier(s) sélectionné(s)
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        <span>
                          {selectedFiles.length} fichier(s) sélectionné(s)
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Sélectionnez un ou plusieurs fichiers .md, ou un fichier .zip
              contenant des skills
            </p>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Loader2
                size={18}
                className="text-blue-600 dark:text-blue-400 animate-spin"
              />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Traitement des fichiers en cours...
              </span>
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle
                  size={18}
                  className="text-red-600 dark:text-red-400 mt-0.5 shrink-0"
                />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                    Erreurs de validation ({validationErrors.length})
                  </h4>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {validationErrors.map((err, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-red-800 dark:text-red-200"
                      >
                        <span className="font-mono">{err.fileName}</span> :{" "}
                        {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="space-y-2">
              {importResult.success > 0 && (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle2
                    size={18}
                    className="text-green-600 dark:text-green-400 mt-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                      {importResult.success} skill(s) importé(s) avec succès
                    </h4>
                  </div>
                </div>
              )}
              {importResult.failed > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle
                    size={18}
                    className="text-red-600 dark:text-red-400 mt-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                      {importResult.failed} échec(s)
                    </h4>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-red-800 dark:text-red-200"
                        >
                          <span className="font-mono">{err.fileName}</span> :{" "}
                          {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed skills preview */}
          {parsedSkills.length > 0 && !importResult && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2
                  size={18}
                  className="text-green-600 dark:text-green-400 mt-0.5 shrink-0"
                />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                    {parsedSkills.length} skill(s) valide(s)
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Prêt(s) à être importé(s)
                  </p>
                </div>
              </div>

              {/* Skills list */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {parsedSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                            /{skill.name}
                          </p>
                          {skill.isComplex && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                              +{skill.additionalFiles?.length} fichiers
                            </span>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {skill.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {skill.content.length} car.
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Fichier : {skill.fileName}
                    </p>
                  </div>
                ))}
              </div>

              {/* Scope selection */}
              <div>
                <Label>Portée</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="import-scope"
                      value="user"
                      checked={scope === "user"}
                      onChange={(e) =>
                        setScope(e.target.value as "user" | "workspace")
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Utilisateur (personnel)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="import-scope"
                      value="workspace"
                      checked={scope === "workspace"}
                      onChange={(e) =>
                        setScope(e.target.value as "user" | "workspace")
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Workspace (partagé avec l'équipe)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Formats supportés
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <div>
                <p className="font-medium">Fichiers .md :</p>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Sélection multiple possible</li>
                  <li>• Chaque fichier doit avoir un frontmatter YAML</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Fichiers .zip :</p>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Peut contenir plusieurs skills</li>
                  <li>• Tous les fichiers .md seront extraits</li>
                  <li>• Structure de dossiers ignorée</li>
                </ul>
              </div>
              <pre className="bg-blue-100 dark:bg-blue-900 p-2 rounded text-xs font-mono mt-2 overflow-x-auto">
                {`---
name: mon-skill
description: Description du skill
---

# Contenu du skill en Markdown`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isImporting}
          >
            {importResult ? "Fermer" : "Annuler"}
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedSkills.length === 0 || isImporting || isProcessing}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Importation...
              </>
            ) : (
              `Importer ${parsedSkills.length > 0 ? `(${parsedSkills.length})` : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
