export const INCOME_TYPES = ['INCOME', 'SALARY', 'ALLOWANCE', 'LOAN_PROCEEDS']
export const LIVING_EXPENSE_TYPES = ['EXPENSE', 'BILL_PAYMENT', 'SUBSCRIPTION', 'DEBT_PAYMENT']

export const calculateTotalIncome = (transactions) =>
  transactions
    .filter((tx) => INCOME_TYPES.includes(tx.type) || (tx.type === 'ADJUSTMENT' && tx.amount > 0))
    .reduce((sum, tx) => sum + tx.amount, 0)

export const calculateBudgetBreakdown = (transactions) => {
  const now = new Date()
  const monthlyTransactions = transactions.filter((tx) => {
    const date = tx.timestampMs ? new Date(tx.timestampMs) : new Date(tx.date)
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const income = calculateTotalIncome(monthlyTransactions)
  const livingActual = monthlyTransactions
    .filter((tx) => LIVING_EXPENSE_TYPES.includes(tx.type))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const savingsActual = monthlyTransactions
    .filter((tx) => tx.type === 'SAVINGS')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const wiredTransfers = monthlyTransactions
    .filter((tx) => tx.type === 'WIRED_TRANSFER')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  return {
    income,
    livingTarget: income * 0.7,
    livingActual,
    savingsTarget: income * 0.2,
    savingsActual,
    extraTarget: income * 0.1,
    extraActual: wiredTransfers + Math.max(0, livingActual - income * 0.7),
  }
}

export const calculateSavingsAllocation = (amount) => ({
  'Emergency Fund': amount * 0.4,
  'Buffer Balance': amount * 0.2,
  'Motorcycle Goal': amount * 0.2,
  'Extra / Wants': amount * 0.2,
})

export const getDaysRemaining = (targetDateMs) => {
  if (!targetDateMs || targetDateMs <= 0) return 0
  const difference = targetDateMs - Date.now()
  return difference > 0 ? Math.ceil(difference / 86400000) : 0
}

export const calculateRequiredDeposits = (account) => {
  const remaining = Math.max(0, Number(account.target || account.targetAmount || 0) - Number(account.balance || account.currentBalance || 0))
  const daysLeft = getDaysRemaining(Number(account.targetDate || 0))
  const monthsLeft = daysLeft / 30.4375

  return {
    remaining,
    daysLeft,
    monthsLeft,
    dailyNeeded: daysLeft > 0 && remaining > 0 ? remaining / daysLeft : 0,
    weeklyNeeded: daysLeft > 0 && remaining > 0 ? remaining / (daysLeft / 7) : 0,
    monthlyNeeded: monthsLeft > 0 && remaining > 0 ? remaining / monthsLeft : 0,
  }
}

export const generateInstallments = (startDate, totalMonths) => {
  const start = new Date(startDate)
  return Array.from({ length: totalMonths }, (_, index) => {
    const dueDate = new Date(start)
    const day = start.getDate()
    dueDate.setDate(1)
    dueDate.setMonth(start.getMonth() + index + 1)
    const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
    dueDate.setDate(Math.min(day, lastDay))
    return { month: index + 1, isPaid: false, dueDate }
  })
}
