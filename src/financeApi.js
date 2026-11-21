import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  writeBatch,
  increment,
  runTransaction,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

export const subscribeTransactions = (userId, callback, errorCallback) =>
  onSnapshot(
    query(collection(db, 'transactions'), where('userId', '==', userId)),
    (snapshot) => {
      const transactions = snapshot.docs
        .map((document) => {
          const data = document.data()
          const timestamp = data.timestamp?.toMillis?.() || Date.now()
          return {
            id: document.id,
            name: data.description || data.name || 'Transaction',
            category: data.category || 'Others',
            date: new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(timestamp),
            timestampMs: timestamp,
            amount: ['EXPENSE', 'DEBT_PAYMENT', 'BILL_PAYMENT', 'SUBSCRIPTION', 'WITHDRAWAL'].includes(data.type)
              ? -Math.abs(Number(data.amount || 0))
              : Math.abs(Number(data.amount || 0)),
            type: data.type || 'EXPENSE',
            source: data.source || 'Cash on Hand',
          }
        })
        .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))
      callback(transactions)
    },
    errorCallback,
  )

export const subscribeSavings = (userId, callback, errorCallback) =>
  onSnapshot(
    query(collection(db, 'savings_accounts'), where('userId', '==', userId)),
    (snapshot) => {
      callback(snapshot.docs.map((document) => {
        const data = document.data()
        return {
          id: document.id,
          name: data.name,
          category: data.category || 'General',
          balance: Number(data.currentBalance || 0),
          target: Number(data.targetAmount || 0),
          targetDate: Number(data.targetDate || 0),
          color: data.category === 'Motorcycle Goal' ? '#6c9f91' : '#244a78',
        }
      }))
    },
    errorCallback,
  )

export const subscribeDebts = (userId, callback, errorCallback) =>
  onSnapshot(
    query(collection(db, 'debts'), where('userId', '==', userId)),
    (snapshot) => {
      callback(snapshot.docs.map((document) => {
        const data = document.data()
        const total = Number(data.totalAmount || 0)
        const remaining = Number(data.remainingAmount ?? total)
        return {
          id: document.id,
          name: data.name,
          type: data.debtType,
          paid: Math.max(0, total - remaining),
          total,
          due: data.dueDate?.toDate
            ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit' }).format(data.dueDate.toDate())
            : 'No date',
          color: data.debtType === 'THEY_OWE_ME' ? '#6c9f91' : '#244a78',
          installmentAmount: Number(data.installmentAmount || 0),
          installments: data.installments || [],
          raw: data,
        }
      }))
    },
    errorCallback,
  )

export const subscribeBills = (userId, callback, errorCallback) =>
  onSnapshot(
    query(collection(db, 'bills'), where('userId', '==', userId)),
    (snapshot) => {
      callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })))
    },
    errorCallback,
  )

export const addTransaction = (userId, transaction) =>
  addDoc(collection(db, 'transactions'), {
    userId,
    amount: Math.abs(transaction.amount),
    category: transaction.category,
    description: transaction.name,
    source: transaction.source,
    timestamp: Timestamp.now(),
    type: transaction.type,
  })

export const addSavingsAccount = async (userId, account) => {
  const balance = Number(account.currentBalance || 0)
  const accountRef = doc(collection(db, 'savings_accounts'))
  const batch = writeBatch(db)
  batch.set(accountRef, {
    userId,
    name: account.name,
    targetAmount: Number(account.targetAmount),
    currentBalance: balance,
    category: account.category,
    targetDate: account.targetDate ? new Date(account.targetDate).getTime() : 0,
  })
  if (balance > 0) {
    const txRef = doc(collection(db, 'transactions'))
    batch.set(txRef, {
      userId,
      amount: balance,
      category: 'Savings',
      description: `Opening balance for ${account.name}`,
      source: 'Cash on Hand',
      timestamp: Timestamp.now(),
      type: 'SAVINGS',
    })
  }
  await batch.commit()
  return accountRef
}

export const depositToSavings = async (userId, account, amount, source) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'savings_accounts', account.id), {
    currentBalance: increment(amount),
  })
  const txRef = doc(collection(db, 'transactions'))
  batch.set(txRef, {
    userId,
    amount,
    category: 'Savings',
    description: `Deposit to ${account.name}`,
    source,
    timestamp: Timestamp.now(),
    type: 'SAVINGS',
  })
  await batch.commit()
}

export const addDebt = async (userId, debt) => {
  const startDate = new Date(`${debt.startDate}T12:00:00`)
  const installments = debt.installments.map((installment) => ({
    month: installment.month,
    isPaid: false,
    dueDate: Timestamp.fromDate(installment.dueDate),
  }))
  const totalAmount = Number(debt.installmentAmount) * Number(debt.totalMonths)
  const debtRef = doc(collection(db, 'debts'))
  const batch = writeBatch(db)
  batch.set(debtRef, {
    userId,
    name: debt.name,
    totalAmount,
    principalAmount: Number(debt.principalAmount),
    remainingAmount: totalAmount,
    installmentAmount: Number(debt.installmentAmount),
    dueDate: installments[0]?.dueDate || Timestamp.fromDate(startDate),
    startDate: Timestamp.fromDate(startDate),
    totalMonths: Number(debt.totalMonths),
    interestRate: Number(debt.interestRate || 0),
    frequency: 'monthly',
    debtType: debt.debtType,
    isPaid: false,
    installments,
  })

  if (Number(debt.principalAmount) > 0) {
    const txRef = doc(collection(db, 'transactions'))
    batch.set(txRef, {
      userId,
      amount: Number(debt.principalAmount),
      description: debt.debtType === 'THEY_OWE_ME' ? `Lent to ${debt.name}` : `Loan proceeds from ${debt.name}`,
      category: debt.debtType === 'THEY_OWE_ME' ? 'Money Lent' : 'Loan Proceeds',
      source: debt.source || 'Cash on Hand',
      type: debt.debtType === 'THEY_OWE_ME' ? 'EXPENSE' : 'LOAN_PROCEEDS',
      timestamp: Timestamp.fromDate(startDate),
    })
  }
  await batch.commit()
  return debtRef
}

export const updateDebtPayment = async (debt) => {
  const debtRef = doc(db, 'debts', debt.id)
  const txRef = doc(collection(db, 'transactions'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(debtRef)
    if (!snapshot.exists()) throw new Error('This debt no longer exists.')
    const current = snapshot.data()
    const installments = current.installments || []
    const nextInstallment = installments.find((installment) => !installment.isPaid)
    if (!nextInstallment) throw new Error('There are no unpaid installments for this debt.')

    const total = Number(current.totalAmount || 0)
    const amount = Number(current.installmentAmount || 0)
    const remainingBefore = Number(current.remainingAmount ?? total)
    const paymentAmount = Math.min(amount, remainingBefore)
    const updatedInstallments = installments.map((installment) => (
      installment.month === nextInstallment.month ? { ...installment, isPaid: true } : installment
    ))
    const remaining = Math.max(0, remainingBefore - paymentAmount)
    const nextDueDate = updatedInstallments.find((installment) => !installment.isPaid)?.dueDate
    transaction.update(debtRef, {
      installments: updatedInstallments,
      remainingAmount: remaining,
      ...(nextDueDate ? { dueDate: nextDueDate } : {}),
      isPaid: remaining <= 0,
    })
    transaction.set(txRef, {
      userId: current.userId,
      amount: paymentAmount,
      category: current.debtType === 'THEY_OWE_ME' ? 'Loan Collection' : 'Debt Payment',
      description: current.debtType === 'THEY_OWE_ME'
        ? `${current.name} paid back`
        : `${current.name} debt payment`,
      source: 'Cash on Hand',
      timestamp: Timestamp.now(),
      type: current.debtType === 'THEY_OWE_ME' ? 'INCOME' : 'DEBT_PAYMENT',
    })
  })
}

export const addBill = (userId, bill) =>
  addDoc(collection(db, 'bills'), {
    userId,
    name: bill.name,
    amount: Number(bill.amount),
    dueDate: Timestamp.fromDate(new Date(`${bill.dueDate}T12:00:00`)),
    frequency: bill.frequency,
    category: bill.category,
    isPaid: false,
  })

export const payBill = async (userId, bill, source) => {
  const billRef = doc(db, 'bills', bill.id)
  const txRef = doc(collection(db, 'transactions'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(billRef)
    if (!snapshot.exists()) throw new Error('This bill no longer exists.')
    const current = snapshot.data()
    if (current.isPaid) throw new Error('This bill is already marked as paid.')
    transaction.update(billRef, { isPaid: true })
    transaction.set(txRef, {
      userId,
      amount: Number(current.amount),
      category: current.category,
      description: `${current.name} bill payment`,
      source,
      timestamp: Timestamp.now(),
      type: 'BILL_PAYMENT',
    })
  })
}
