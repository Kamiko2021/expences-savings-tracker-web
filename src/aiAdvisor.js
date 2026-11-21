import { GoogleGenerativeAI } from '@google/generative-ai'

export const getAIFinancialAdvice = async (apiKey, financialSummary) => {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
  const prompt = `You are a practical personal finance coach. Analyze the data using the 70/20/10 rule: 70% living expenses and debt, 20% savings, 10% extra/support. Do not invent amounts. Return only JSON with this shape: {"roadmap":"Three actionable sentences","goals":[{"category":"Name","amount":0}],"challenge":"One weekly savings challenge"}.\n\nFinancial data:\n${financialSummary}`
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  return JSON.parse(text)
}
