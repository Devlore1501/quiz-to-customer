import { useEffect } from "react";
import EmailMarketingSurvey from "@/components/EmailMarketingSurvey";

const Quiz = () => {
  useEffect(() => {
    // Re-fire PageView for SPA navigation (React Router doesn't reload HTML)
    window.fbq?.('track', 'PageView');

    /* `Lead` NON si spara più qui.
       Prima partiva a OGNI pageview del quiz, senza alcuna condizione. Ma la
       landing spara già `Lead` all'opt-in, e da lì si arriva qui subito dopo il
       redirect: ogni lead veniva quindi contato DUE VOLTE, gonfiando le
       conversioni ~2x. Con un volume già scarso (~3 opt-in/settimana) questo
       rende l'ottimizzazione di Meta ancora meno affidabile.

       Ora la conversione si conta in UN SOLO punto: la landing, per tutti gli
       opt-in, con `value` differenziato per qualifica (qualificato=10, non=1).

       Chi atterra qui senza passare dall'opt-in non è una conversione: al più
       è un visitatore. Per quello restano `QuizPageView` qui sotto e
       `EngagedLead` (da EmailMarketingSurvey) — segnale, non conversione. */
    window.fbq?.('trackCustom', 'QuizPageView');
  }, []);

  return <EmailMarketingSurvey skipIntro />;
};

export default Quiz;
