// Facebook Pixel Tracking Utilities

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Track a custom Facebook Pixel event
 */
export const trackFacebookEvent = (
  eventName: string,
  parameters?: Record<string, unknown>
): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
    console.log(`[Facebook Pixel] Event: ${eventName}`, parameters);
  } else {
    console.warn('[Facebook Pixel] fbq not available');
  }
};

/**
 * Track form completion as CompleteRegistration event
 * This fires immediately when the form is submitted
 */
export const trackCompleteRegistration = (data: {
  sector: string;
  email: string;
  companyName: string;
}): void => {
  trackFacebookEvent('CompleteRegistration', {
    content_name: 'Email Marketing Quiz',
    content_category: data.sector,
    status: 'complete',
  });
};

/**
 * Track quiz completion as a Lead event
 * This fires after successful webhook delivery for CAPI matching
 */
export const trackQuizCompleted = (data: {
  sector: string;
  yearlyPotential: number;
  emailHealthScore: number;
  leadQuality: string;
  monthlyRevenue: number;
}): void => {
  trackFacebookEvent('Lead', {
    content_name: 'Email Marketing Quiz',
    content_category: data.sector,
    value: data.yearlyPotential,
    currency: 'EUR',
    email_health_score: data.emailHealthScore,
    lead_quality: data.leadQuality,
    monthly_revenue: data.monthlyRevenue,
  });
};
