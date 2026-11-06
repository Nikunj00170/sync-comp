export const fields = ['business', 'needs', 'sites', 'employees', 'budget', 'tier', 'gstin'];
export const missingFields = (requirements) =>
  fields.filter((k) => requirements[k] === undefined || requirements[k] === '');
const questions = {
  'en-IN': {
    business: 'What kind of business do you run?',
    needs: 'What would you like to improve: internet, security, communications, or something else?',
    sites: 'How many business locations do you need to connect?',
    employees: 'How many employees do you have?',
    budget: 'What is your monthly budget in rupees?',
    tier: 'Is your location in a Tier 1 or Tier 2 city?',
    gstin: 'Does your business have a GST registration?',
  },
  'hi-IN': {
    business: 'आपका किस तरह का व्यवसाय है?',
    needs: 'आपको इंटरनेट, सुरक्षा, संचार या किस सेवा की ज़रूरत है?',
    sites: 'कितने व्यावसायिक स्थानों को जोड़ना है?',
    employees: 'आपके व्यवसाय में कितने कर्मचारी हैं?',
    budget: 'आपका मासिक बजट कितने रुपये है?',
    tier: 'आपका शहर टियर 1 में है या टियर 2 में?',
    gstin: 'क्या आपके व्यवसाय का जीएसटी पंजीकरण है?',
  },
};
export function quickReply(transcript, detectedLanguage, session) {
  const language = detectedLanguage || session.language;
  if (!questions[language] || (session.language && language !== session.language)) return null;
  const field = session.awaiting;
  if (!missingFields(session.requirements || {}).includes(field)) return null;
  const text = transcript
    .trim()
    .toLowerCase()
    .replace(/[.!?।]+$/, '')
    .replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x966));
  let value;
  if (['sites', 'employees', 'budget', 'tier'].includes(field)) {
    // Accept a standalone value only. Corrections, explanations and extra facts go to Gemini.
    const match = text.match(
      /^(?:₹|rs\.?\s*|inr\s*|tier\s*|टियर\s*)?([0-9]+(?:,[0-9]{3})*)(?:\s*(?:rupees|रुपये|रुपए|employees|people|sites|locations|कर्मचारी|स्थान))?$/,
    );
    if (match) {
      const suffix = text.match(
        /(?:rupees|रुपये|रुपए|employees|people|sites|locations|कर्मचारी|स्थान)$/,
      )?.[0];
      if (
        suffix &&
        !{
          budget: ['rupees', 'रुपये', 'रुपए'],
          employees: ['employees', 'people', 'कर्मचारी'],
          sites: ['sites', 'locations', 'स्थान'],
          tier: [],
        }[field].includes(suffix)
      )
        return null;
      if (
        (/^(?:₹|rs|inr)/.test(text) && field !== 'budget') ||
        (/^(?:tier|टियर)/.test(text) && field !== 'tier')
      )
        return null;
      value = Number(match[1].replaceAll(',', ''));
      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 10000000 ||
        (field === 'tier' && ![1, 2].includes(value))
      )
        return null;
    }
  } else if (field === 'gstin') {
    if (['yes', 'हाँ', 'हां', 'जी हाँ', 'जी हां'].includes(text)) value = true;
    if (['no', 'नहीं', 'नही'].includes(text)) value = false;
  }
  if (value === undefined) return null;
  const requirements = { ...session.requirements, [field]: value };
  const missing = missingFields(requirements);
  if (!missing.length) return null; // Complete profile still needs model-backed product selection and validation.
  const awaiting = missing[0];
  return { requirements, language, awaiting, answer: questions[language][awaiting] };
}
