export const getAIFinancialAdvice = async (idToken, financialSummary) => {
  const response = await fetch('/api/advisor', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ financialSummary }),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'Could not generate financial advice.')
  }
  return result
}
