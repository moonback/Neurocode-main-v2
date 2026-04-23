// Update this page (the content is just a fallback if you fail to update the page)

import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Bienvenue dans votre application vierge</h1>
        <p className="text-xl text-gray-600">
          Commencez ici à bâtir votre projet exceptionnel !
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;
