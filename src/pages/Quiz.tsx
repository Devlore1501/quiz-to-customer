import { useEffect } from "react";
import EmailMarketingSurvey from "@/components/EmailMarketingSurvey";

const Quiz = () => {
  useEffect(() => {
    // Re-fire PageView for SPA navigation (React Router doesn't reload HTML)
    window.fbq?.('track', 'PageView');
    // Custom event for reliable CC triggering (URL matching on PageView is flaky on SPAs)
    window.fbq?.('trackCustom', 'QuizPageView');
  }, []);

  return <EmailMarketingSurvey skipIntro />;
};

export default Quiz;
