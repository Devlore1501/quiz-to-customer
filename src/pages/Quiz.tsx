import { useEffect } from "react";
import EmailMarketingSurvey from "@/components/EmailMarketingSurvey";

const Quiz = () => {
  useEffect(() => {
    // Re-fire PageView for SPA navigation (React Router doesn't reload HTML)
    window.fbq?.('track', 'PageView');
    // Lead = atterra sulla pagina quiz (standard Meta event per ottimizzazione campagna)
    window.fbq?.('track', 'Lead');
    window.fbq?.('trackCustom', 'QuizPageView');
  }, []);

  return <EmailMarketingSurvey skipIntro />;
};

export default Quiz;
