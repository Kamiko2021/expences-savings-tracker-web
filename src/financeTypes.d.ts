import type { Timestamp } from 'firebase/firestore'

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'SALARY'
  | 'ALLOWANCE'
  | 'SAVINGS'
  | 'ADJUSTMENT'
  | 'WITHDRAWAL'
  | 'DEPOSIT'
  | 'TRANSFER'
  | 'DEBT_PAYMENT'
  | 'BILL_PAYMENT'
  | 'SUBSCRIPTION'
  | 'WIRED_TRANSFER'
  | 'CASH_ON_HAND'
  | 'LOAN_PROCEEDS'

export type DebtType = 'I_OWE' | 'THEY_OWE_ME'
export type SavingsCategory =
  | 'Emergency Fund'
  | 'Buffer Balance'
  | 'Motorcycle Goal'
  | 'Extra / Wants'
  | 'General'

export interface Transaction {
  id?: string
  userId: string
  amount: number
  category: string
  description: string
  source: string
  destinationSource?: string
  timestamp: Timestamp
  type: TransactionType
}

export interface Installment {
  month: number
  isPaid: boolean
  dueDate: Timestamp
}

export interface Debt {
  id?: string
  userId: string
  name: string
  totalAmount: number
  principalAmount: number
  remainingAmount: number
  installmentAmount: number
  dueDate: Timestamp
  startDate: Timestamp
  totalMonths: number
  interestRate: number
  frequency: string
  debtType: DebtType
  isPaid: boolean
  installments: Installment[]
}

export interface SavingsAccount {
  id?: string
  userId: string
  name: string
  targetAmount: number
  currentBalance: number
  category: SavingsCategory
  targetDate: number
}

export interface Bill {
  id?: string
  userId: string
  name: string
  amount: number
  dueDate: Timestamp
  frequency: string
  category: string
  isPaid: boolean
}

export interface CreditAccount {
  id?: string
  userId: string
  name: string
  creditLimit: number
  currentBalance: number
  dueDate: Timestamp
}
