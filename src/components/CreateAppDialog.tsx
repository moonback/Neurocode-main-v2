import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateApp } from "@/hooks/useCreateApp";
import { useCheckName } from "@/hooks/useCheckName";
import { NEON_TEMPLATE_IDS, Template } from "@/shared/templates";
import { useSelectChat } from "@/hooks/useSelectChat";

import { Loader2, FolderPlus } from "lucide-react";
import { neonTemplateHook } from "@/client_logic/template_hook";
import { showError } from "@/lib/toast";

interface CreateAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | undefined;
}

export function CreateAppDialog({
  open,
  onOpenChange,
  template,
}: CreateAppDialogProps) {
  const { t } = useTranslation(["home", "common"]);
  const [appName, setAppName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createApp } = useCreateApp();
  const { data: nameCheckResult } = useCheckName(appName);
  const { selectChat } = useSelectChat();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appName.trim()) {
      return;
    }

    if (nameCheckResult?.exists) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createApp({ name: appName.trim() });
      if (template && NEON_TEMPLATE_IDS.has(template.id)) {
        await neonTemplateHook({
          appId: result.app.id,
          appName: result.app.name,
        });
      }
      // Selecting the new chat seeds recent tab order immediately.
      selectChat({ chatId: result.chatId, appId: result.app.id });
      setAppName("");
      onOpenChange(false);
    } catch (error) {
      showError(error as any);
      // Error is already handled by createApp hook or shown above
      console.error("Error creating app:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNameValid = appName.trim().length > 0;
  const nameExists = nameCheckResult?.exists;
  const canSubmit = isNameValid && !nameExists && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-2xl">
        <div className="p-7">
          <DialogHeader className="mb-6 text-left">
            <div className="w-12 h-12 rounded-full bg-blue-100/50 dark:bg-blue-900/20 flex items-center justify-center mb-5">
              <FolderPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {t("home:createNewApp")}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-muted-foreground mt-2 leading-relaxed">
              {t("home:createAppUsingTemplate", { template: template?.title })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 mb-8">
              <div className="grid gap-2">
                <Label htmlFor="appName" className="text-sm font-medium text-foreground">
                  {t("home:appName")}
                </Label>
                <Input
                  id="appName"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder={t("home:enterAppName")}
                  className={`h-11 shadow-sm transition-all duration-200 focus-visible:ring-2 ${
                    nameExists 
                      ? "border-red-500 focus-visible:ring-red-500/20" 
                      : "focus-visible:border-blue-500 focus-visible:ring-blue-500/20 hover:border-border/80"
                  }`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoFocus
                />
                {nameExists && (
                  <p className="text-[13px] font-medium text-red-500 flex items-center gap-1.5 mt-1">
                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                    {t("home:appNameAlreadyExists")}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-3 sm:space-x-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-11 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-lg font-medium"
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm transition-all duration-200 rounded-lg font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common:creating")}
                  </>
                ) : (
                  t("home:createApp")
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
