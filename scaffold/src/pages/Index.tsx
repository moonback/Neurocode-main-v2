// Update this page (the content is just a fallback if you fail to update the page)

import { Loader2, Sparkles } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans selection:bg-blue-100">
      <div className="flex-1 flex items-center justify-center w-full px-6">
        <div className="max-w-md w-full text-center">
          {/* Animated AI Core */}
          <div className="relative mx-auto w-24 h-24 mb-10 flex items-center justify-center">
            {/* Soft glowing background */}
            <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-xl animate-pulse"></div>

            {/* Inner rings */}
            <div className="absolute inset-2 bg-white rounded-full shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center justify-center">
              <Loader2
                className="w-8 h-8 text-blue-600 animate-spin"
                strokeWidth={2}
              />
            </div>

            {/* Floating sparkle */}
            <Sparkles
              className="absolute -top-1 -right-2 w-5 h-5 text-indigo-400 animate-bounce"
              style={{ animationDuration: "3s" }}
            />
          </div>

          {/* Typography */}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-4">
            L'IA crée votre application
          </h1>

          <p className="text-base text-slate-500 leading-relaxed font-light mb-8 max-w-sm mx-auto">
            Veuillez patienter pendant que nous générons le code, l'architecture
            et le design de votre projet.
          </p>

          {/* Minimalist Progress Indicator */}
          <div className="flex items-center justify-center gap-3">
            <span
              className="w-2 h-2 rounded-full bg-blue-600 animate-ping"
              style={{ animationDuration: "1.5s" }}
            ></span>
            <span className="text-sm font-medium text-blue-600 uppercase tracking-widest">
              Développement en cours
            </span>
          </div>
        </div>
      </div>

      <div className="py-6">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;
