export async function register() {
  // Only the Node.js server tokenizes Japanese; skip the edge runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmUpTokenizer } = await import("@/server/nlp/tokenize-japanese");
    warmUpTokenizer();
  }
}
