// Update this page (the content is just a fallback if you fail to update the page)

import { Loader2 } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Application en cours de developpement</h1>
        <p className="text-xl text-gray-600">
          Merci de votre patience :
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" strokeWidth={1.5} />
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;
