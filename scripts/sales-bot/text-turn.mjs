import { converse, languages } from './conversation.mjs';
export async function textTurn(input, session, options) {
  if (!input || input.consent !== true) throw Object.assign(new Error('Conversation consent is required.'), { status: 400 });
  if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 2000)
    throw Object.assign(new Error('Enter a message of 1 to 2000 characters.'), { status: 400 });
  if (!languages.includes(input.language)) throw Object.assign(new Error('Choose a supported language.'), { status: 400 });
  return converse(input.message.trim(), input.language, session, options);
}
