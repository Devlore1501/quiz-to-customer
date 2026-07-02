import { useEffect } from "react";
import EmailMarketingSurvey from "@/components/EmailMarketingSurvey";

const Quiz = () => {
  useEffect(() => {
    // Re-fire PageView for SPA navigation (React Router doesn't reload HTML)
    window.fbq?.('track', 'PageView');
  }, []);

  return <EmailMarketingSurvey skipIntro />;
};

export default Quiz;
