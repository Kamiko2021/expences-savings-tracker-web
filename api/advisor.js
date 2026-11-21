import process from 'node:process'

const SUMMARY_FIELDS = [
  'income',
  'livingTarget',
  'livingActual',
  'savingsTarget',
  'savingsActual',
  'extraTarget',
  'extraActual',
]

const isValidSummary = (summary) => (
  summary
  && typeof summary === 'object'
  && !Array.isArray(summary)
  && Object.keys(summary).length === SUMMARY_FIELDS.length
  && SUMMARY_FIELDS.every((field) => (
    Number.isFinite(summary[field])
    && summary[field] >= 0
    && summary[field] <= 1_000_000_000
  ))
)

const parseAdvice = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  const advice = JSON.parse(cleaned)
  if (
    typeof advice.roadmap !== 'string'
    || !Array.isArray(advice.goals)
    || typeof advice.challenge !== 'string'
    || advice.goals.some((goal) => (
      typeof goal?.category !== 'string'
      || !Number.isFinite(goal.amount)
    ))
  ) {
    throw new Error('The advisor returned an unexpected response.')
  }
  return {
    roadmap: advice.roadmap,
    goals: advice.goals,
    challenge: advice.challenge,
  }
}

const geminiFailureMessage = (statusCode, errorStatus = '', errorMessage = '') => {
  const status = `${errorStatus} ${errorMessage}`.toLowerCase()

  if (status.includes('api_key_invalid') || status.includes('api key not valid')) {
    return 'Gemini rejected the API key. Replace GEMINI_API_KEY with a valid Gemini API key, then restart the dev server or redeploy.'
  }
  if (statusCode === 403 || status.includes('permission_denied')) {
    return 'Gemini denied access. Check that the key is for the Gemini API, API access is enabled, and key restrictions allow this app.'
  }
  if (statusCode === 404 || status.includes('not_found')) {
    return `Gemini model "${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'}" was not found or is unavailable to this API key. Check that the model appears in the key project's Gemini API model list, then set GEMINI_MODEL to an available model and redeploy or restart the dev server.`
  }
  if (statusCode === 429 || status.includes('resource_exhausted')) {
    return 'Gemini quota or rate limit reached. Check the API project quota and billing, then try again later.'
  }
  if (statusCode >= 500) {
    return 'Gemini is temporarily unavailable. Try again later.'
  }
  if (statusCode === 400) {
    return 'Gemini rejected the request. Check the model and API access for this key.'
  }
  return 'The advisor service could not generate a response. Try again later.'
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  if (!apiKey || !firebaseApiKey) {
    console.error('Financial advisor requires GEMINI_API_KEY and VITE_FIREBASE_API_KEY.')
    return response.status(503).json({ error: 'The financial advisor is not configured.' })
  }

  const idToken = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (!idToken) {
    return response.status(401).json({ error: 'Sign in to use the financial advisor.' })
  }

  try {
    const identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )
    if (!identityResponse.ok) {
      return response.status(401).json({ error: 'Your session is invalid or expired. Sign in again.' })
    }

    const { financialSummary } = request.body || {}
    if (!isValidSummary(financialSummary)) {
      return response.status(400).json({ error: 'The financial summary is invalid.' })
    }

    const prompt = `You are a practical personal finance coach. Analyze the data using the 70/20/10 rule: 70% living expenses and debt, 20% savings, 10% extra/support. Do not invent amounts. Return only JSON with this shape: {"roadmap":"Three actionable sentences","goals":[{"category":"Name","amount":0}],"challenge":"One weekly savings challenge"}.\n\nFinancial data:\n${JSON.stringify(financialSummary)}`
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json().catch(() => ({}))
      const providerError = errorBody.error || {}
      const errorStatus = typeof providerError.status === 'string' ? providerError.status : ''
      const errorMessage = typeof providerError.message === 'string' ? providerError.message : ''
      console.error('Gemini advisor request failed:', {
        httpStatus: geminiResponse.status,
        providerStatus: errorStatus || 'unknown',
        reason: errorMessage.toLowerCase().includes('api key') ? 'api-key' : 'provider',
      })
      return response.status(502).json({
        error: geminiFailureMessage(geminiResponse.status, errorStatus, errorMessage),
      })
    }

    const result = await geminiResponse.json()
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')
    if (!text) {
      const finishReason = result.candidates?.[0]?.finishReason
      console.error('Gemini advisor returned no text:', finishReason || 'unknown finish reason')
      return response.status(502).json({
        error: finishReason === 'SAFETY'
          ? 'Gemini could not provide advice for this request. Try again with a more general financial summary.'
          : 'Gemini returned no advice. Try again later.',
      })
    }

    try {
      return response.status(200).json(parseAdvice(text))
    } catch (error) {
      console.error('Gemini advisor returned invalid JSON:', error.name)
      return response.status(502).json({ error: 'Gemini returned an unreadable response. Try again later.' })
    }
  } catch (error) {
    console.error('Financial advisor request failed:', error.name || 'UnknownError')
    return response.status(502).json({ error: 'The advisor service could not generate a response. Try again later.' })
  }
}
