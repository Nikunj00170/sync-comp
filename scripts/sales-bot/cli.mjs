import { answerQuestion, loadCatalogue } from './catalogue.mjs';

try {
  const products = await loadCatalogue();
  if (process.argv[2] === '--check') {
    console.log(
      `Loaded ${products.length} products from case_source/product_catalogue.csv. No API request made.`,
    );
  } else {
    console.log(
      await answerQuestion(process.argv.slice(2).join(' '), {
        products,
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL,
      }),
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
