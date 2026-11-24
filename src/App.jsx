import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ArrowRight,
  CreditCard,
  Copy,
  Download,
  ExternalLink,
  Landmark,
  LayoutDashboard,
  Moon,
  Plus,
  ReceiptText,
  Search,
  Share2,
  Settings,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
  Sparkles,
  Smartphone,
  X,
} from 'lucide-react'
import './App.css'
import { auth, loginAccount, logoutAccount, registerAccount } from './firebase'
import { loadAppReleaseInfo } from './appRemoteConfig'
import {
  calculateBudgetBreakdown,
  calculateRequiredDeposits,
  calculateSavingsAllocation,
  generateInstallments,
  INCOME_TYPES,
} from './financeLogic'
import {
  addTransaction as saveTransaction,
  addBill,
  addDebt,
  addSavingsAccount,
  depositToSavings,
  payBill,
  subscribeBills,
  subscribeDebts,
  subscribeSavings,
  subscribeTransactions,
  updateDebtPayment,
} from './financeApi'

const peso = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)

const categoryPalette = ['#315d91', '#7ec8ef', '#f4b76b', '#f7d7e6', '#84b7a4', '#e58d8d']
const appPublicUrl = 'https://expences-savings-tracker-web.vercel.app'

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tutorial', label: 'How to use', icon: BookOpen },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'savings', label: 'Savings', icon: Target },
  { id: 'debts', label: 'Debts & Loans', icon: CreditCard },
  { id: 'bills', label: 'Bills', icon: WalletCards },
  { id: 'advisor', label: 'AI Advisor', icon: Sparkles },
  { id: 'about', label: 'About', icon: UserRound },
]

function AccountAvatar({ user, compact = false }) {
  const identity = user?.displayName || user?.email || ''
  const initials = identity
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  return (
    <span className={`avatar${compact ? ' avatar-compact' : ''}`}>
      {user?.photoURL
        ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        : initials || <UserRound size={compact ? 16 : 19} />}
    </span>
  )
}

function LandingPage({ user, theme, onThemeToggle, onStart, onTutorial, onAbout, onInstall, isInstalled, releaseInfo, releaseError }) {
  return (
    <main className={`landing-page ${theme}`}>
      <header className="landing-nav">
        <a className="landing-brand" href="#home">
          <span className="brand-mark"><img src="/peraetrackmo-mark.svg" alt="" /></span>
          <span>PeraETrackMo</span>
        </a>
        <nav aria-label="Landing page navigation">
          <a href="#features">Features</a>
          <button onClick={onTutorial}>How it works</button>
          <button onClick={onAbout}>About</button>
          <button className="landing-theme-toggle" onClick={onThemeToggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
          {releaseInfo.updateUrl && (
            <a className="landing-install" href={releaseInfo.updateUrl} target="_blank" rel="noreferrer">
              <Download size={14} /> Android APK{releaseInfo.versionCode ? ` · v${releaseInfo.versionCode}` : ''}
            </a>
          )}
          <button className="landing-install" onClick={onInstall} disabled={isInstalled}><Smartphone size={14} /> {isInstalled ? 'PWA installed' : 'Install web app'}</button>
          <button className="landing-login" onClick={onStart}>{user ? 'Open dashboard' : 'Sign in'}</button>
        </nav>
      </header>

      <section className="landing-hero" id="home">
        <div className="landing-copy">
          <span className="landing-kicker"><span /> YOUR MONEY, WITH A PLAN</span>
          <h1>Make room for<br />what <em>matters.</em></h1>
          <p>One calm place to track everyday spending, build savings, and make confident progress toward your goals.</p>
          <div className="landing-actions">
            <button className="landing-primary" onClick={onStart}>{user ? 'Open your dashboard' : 'Get started for free'} <ArrowRight size={17} /></button>
            <button className="landing-secondary" onClick={onTutorial}><BookOpen size={17} /> Take the quick tour</button>
            <button className="landing-install-cta" onClick={onInstall} disabled={isInstalled}><Smartphone size={16} /> {isInstalled ? 'Web app installed' : 'Install web app'}</button>
            {releaseInfo.updateUrl && (
              <a className="landing-apk-cta" href={releaseInfo.updateUrl} target="_blank" rel="noreferrer">
                <Download size={16} /> Download Android APK{releaseInfo.versionCode ? ` · v${releaseInfo.versionCode}` : ''}
              </a>
            )}
          </div>
          {releaseError && <p className="release-error">{releaseError}</p>}
          <div className="landing-trust"><CheckCircle2 size={16} /><span>Private to your account</span><i /> <span>Built around your goals</span></div>
        </div>

        <div className="landing-preview" aria-label="Preview of the PeraETrackMo finance dashboard">
          <div className="preview-window">
            <div className="preview-top"><span className="preview-logo"><i><img src="/peraetrackmo-mark.svg" alt="" /></i> PeraETrackMo</span><span className="preview-avatar">K</span></div>
            <div className="preview-welcome"><small>YOUR FINANCIAL OVERVIEW</small><strong>A clearer view of your money.</strong></div>
            <div className="preview-balance"><span>Total balance</span><strong>₱ 84,250</strong><small>↗ Looking good this month</small></div>
            <div className="preview-stats">
              <div><span>Income</span><strong>₱ 42,000</strong><i className="preview-line line-income" /></div>
              <div><span>Expenses</span><strong>₱ 18,600</strong><i className="preview-line line-expense" /></div>
            </div>
            <div className="preview-goal"><div className="preview-goal-icon"><Target size={17} /></div><div><span>Emergency fund</span><strong>68% of goal</strong></div><div className="preview-progress"><i /></div></div>
          </div>
          <div className="floating-note"><span className="floating-note-icon"><CheckCircle2 size={16} /></span><span><strong>You're on track</strong><small>Your savings are growing</small></span></div>
          <span className="preview-orbit orbit-one" /><span className="preview-orbit orbit-two" />
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-heading"><span>MADE FOR REAL LIFE</span><h2>All the pieces. One clear picture.</h2><p>Simple tools to help make your next money decision feel easier.</p></div>
        <div className="feature-grid">
          <article><span className="feature-icon feature-blue"><ReceiptText size={19} /></span><h3>Know where it goes</h3><p>Log income and expenses, see recent activity, and understand your monthly cash flow.</p></article>
          <article><span className="feature-icon feature-green"><Target size={19} /></span><h3>Save with purpose</h3><p>Build savings goals, plan deposits, and split money with a practical 40/20/20/20 guide.</p></article>
          <article><span className="feature-icon feature-sand"><CreditCard size={19} /></span><h3>Stay ahead of payments</h3><p>Keep debt installments and recurring bills visible, with payment history in one place.</p></article>
        </div>
      </section>

      <section className="landing-share" id="share">
        <div>
          <span className="share-kicker">SHARE WITH ANYONE</span>
          <h2>One scan brings them to PeraETrackMo.</h2>
          <p>Scan the QR code to visit the app, explore the public landing page, and create an account to start tracking privately.</p>
          <a className="landing-primary share-open-link" href={appPublicUrl} target="_blank" rel="noopener noreferrer">
            Open PeraETrackMo <ExternalLink size={16} />
          </a>
        </div>
        <a className="landing-qr-card" href={appPublicUrl} target="_blank" rel="noopener noreferrer" aria-label="Scan or open PeraETrackMo">
          <img src="/perae-track-mo-app-qr.png" alt="QR code linking to the PeraETrackMo app" />
          <span>SCAN TO VISIT PERAETRACKMO</span>
        </a>
      </section>

      <footer className="landing-footer">
        <span className="landing-brand"><span className="brand-mark"><img src="/peraetrackmo-mark.svg" alt="" /></span> PeraETrackMo</span>
        <span>Your finances, a little more in focus.</span>
        <div className="landing-footer-links">
          <button onClick={onTutorial}>Read the getting-started guide <ArrowRight size={14} /></button>
          <button onClick={onAbout}>About the developer <ArrowRight size={14} /></button>
          <a href="/eula.html">End User License Agreement</a>
        </div>
      </footer>
    </main>
  )
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem('peraetrackmo-theme')
        || window.localStorage.getItem('perawise-theme')
        || window.localStorage.getItem('finora-theme')
      return savedTheme === 'dark' ? 'dark' : 'light'
    } catch (error) {
      console.error('The saved theme preference could not be read:', error)
      return 'light'
    }
  })
  const [showLanding, setShowLanding] = useState(true)
  const [activeNav, setActiveNav] = useState('overview')
  const [transactions, setTransactions] = useState([])
  const [entryModal, setEntryModal] = useState('')
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState(null)
  const [bills, setBills] = useState([])
  const [connectionError, setConnectionError] = useState('')
  const [savingAmount, setSavingAmount] = useState(8000)
  const [allocationSource, setAllocationSource] = useState('Manual amount')
  const [advisorResult, setAdvisorResult] = useState(null)
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const [authMode, setAuthMode] = useState('register')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [releaseInfo, setReleaseInfo] = useState({ updateUrl: '', versionCode: null })
  const [releaseError, setReleaseError] = useState('')
  const [appLinkCopied, setAppLinkCopied] = useState(false)

  const [debts, setDebts] = useState([])

  const [goals, setGoals] = useState([])

  useEffect(() => {
    try {
      window.localStorage.setItem('peraetrackmo-theme', theme)
    } catch (error) {
      console.error('The theme preference could not be saved:', error)
    }
  }, [theme])

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const updateInstalled = () => {
      setIsInstalled(standaloneQuery.matches || window.navigator.standalone === true)
    }
    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
      setShowInstallHelp(false)
    }

    updateInstalled()
    standaloneQuery.addEventListener('change', updateInstalled)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      standaloneQuery.removeEventListener('change', updateInstalled)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    let active = true
    loadAppReleaseInfo()
      .then((info) => {
        if (active) {
          setReleaseInfo(info)
          setReleaseError('')
        }
      })
      .catch((error) => {
        console.error('Firebase Remote Config could not be loaded:', error)
        if (active) setReleaseError('Could not load the Android release link. Try again later.')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let unsubscribes = []

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null)
      if (user) setShowLanding(false)
      setConnectionError(user ? '' : 'Sign in or create an account to sync your data.')
      unsubscribes.forEach((unsubscribe) => unsubscribe())
      unsubscribes = []
      if (!user) {
        setTransactions([])
        setGoals([])
        setDebts([])
        setBills([])
        return
      }

      const handleError = (error) => {
        setConnectionError(error.message || 'Could not connect to Firestore')
      }

      const unsubscribeTransactions = subscribeTransactions(user.uid, (items) => {
        setTransactions(items)
        setConnectionError('')
      }, handleError)
      const unsubscribeSavings = subscribeSavings(user.uid, setGoals, handleError)
      const unsubscribeDebts = subscribeDebts(user.uid, setDebts, handleError)
      const unsubscribeBills = subscribeBills(user.uid, setBills, handleError)

      unsubscribes = [
        unsubscribeTransactions,
        unsubscribeSavings,
        unsubscribeDebts,
        unsubscribeBills,
      ]
    })

    return () => {
      unsubscribeAuth()
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const totals = useMemo(() => {
    const monthly = calculateBudgetBreakdown(transactions)
    const cashBalance = transactions.reduce((sum, tx) => {
      if (['EXPENSE', 'BILL_PAYMENT', 'SUBSCRIPTION', 'DEBT_PAYMENT', 'SAVINGS', 'WITHDRAWAL', 'WIRED_TRANSFER'].includes(tx.type)) return sum - Math.abs(tx.amount)
      if (INCOME_TYPES.includes(tx.type) || tx.type === 'ADJUSTMENT') return sum + tx.amount
      return sum
    }, 0)
    const savedBalance = goals.reduce((sum, goal) => sum + goal.balance, 0)
    return { income: monthly.income, expense: monthly.livingActual, balance: cashBalance + savedBalance }
  }, [transactions, goals])
  const budget = useMemo(() => calculateBudgetBreakdown(transactions), [transactions])
  const cashFlow = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      const monthTransactions = transactions.filter((tx) => {
        const date = new Date(tx.timestampMs || tx.date)
        return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth()
      })
      return {
        label: new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(monthDate),
        income: calculateBudgetBreakdown(monthTransactions).income,
        expense: monthTransactions
          .filter((tx) => ['EXPENSE', 'BILL_PAYMENT', 'SUBSCRIPTION', 'DEBT_PAYMENT'].includes(tx.type))
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      }
    })
    return months
  }, [transactions])
  const maxCashFlow = Math.max(1, ...cashFlow.flatMap((month) => [month.income, month.expense]))
  const cashFlowAxis = [1, 0.75, 0.5, 0.25, 0].map((share) => `${Math.round((maxCashFlow * share) / 1000)}k`)
  const spendingByCategory = useMemo(() => {
    const currentMonthTransactions = transactions.filter((tx) => {
      const date = new Date(tx.timestampMs || tx.date)
      const now = new Date()
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })
    const totalsByCategory = currentMonthTransactions
      .filter((tx) => ['EXPENSE', 'BILL_PAYMENT', 'SUBSCRIPTION', 'DEBT_PAYMENT'].includes(tx.type))
      .reduce((totals, tx) => {
        totals[tx.category] = (totals[tx.category] || 0) + Math.abs(tx.amount)
        return totals
      }, {})
    const total = Object.values(totalsByCategory).reduce((sum, amount) => sum + amount, 0)
    return Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount], index) => ({
        name,
        amount,
        value: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: categoryPalette[index % categoryPalette.length],
      }))
  }, [transactions])
  const spendingDonut = spendingByCategory.length
    ? `conic-gradient(${spendingByCategory.reduce((result, category) => {
      const previous = result.total
      const next = previous + (category.amount / Math.max(1, spendingByCategory.reduce((sum, item) => sum + item.amount, 0))) * 100
      result.stops.push(`${category.color} ${previous}% ${next}%`)
      result.total = next
      return result
    }, { stops: [], total: 0 }).stops.join(', ')})`
    : '#efedf2'
  const allocationSourceBalances = useMemo(() => {
    const cashEffect = (transaction) => transaction.type === 'SAVINGS' ? -Math.abs(transaction.amount) : transaction.amount
    const balances = { 'Manual amount': savingAmount, 'Total available': Math.max(0, transactions.reduce((sum, tx) => sum + cashEffect(tx), 0)) }
    for (const transaction of transactions) {
      balances[transaction.source] = (balances[transaction.source] || 0) + cashEffect(transaction)
    }
    return balances
  }, [savingAmount, transactions])

  const addTransaction = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    const kind = form.get('kind')
    if (!userId) {
      setConnectionError('Firebase is still connecting. Please try again.')
      return
    }

    try {
      await saveTransaction(userId, {
        name: form.get('name'),
        category: form.get('category'),
        amount,
        type: kind,
        source: form.get('source'),
      })
      setConnectionError('')
      setEntryModal('')
    } catch (error) {
      setConnectionError(error.message || 'Could not save transaction')
    }
  }

  const filteredTransactions = transactions.filter((tx) =>
    `${tx.name} ${tx.category}`.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDebtAction = async (debt) => {
    try {
      await updateDebtPayment(debt)
      setConnectionError('')
    } catch (error) {
      setConnectionError(error.message || 'Could not update debt')
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      if (!userId) throw new Error('Firebase is still connecting. Please try again.')
      if (entryModal === 'savings') {
        await addSavingsAccount(userId, data)
      } else if (entryModal === 'debt') {
        const totalMonths = Number(data.totalMonths)
        const installmentAmount = Number(data.installmentAmount)
        await addDebt(userId, {
          ...data,
          totalMonths,
          installmentAmount,
          installments: generateInstallments(new Date(`${data.startDate}T12:00:00`), totalMonths),
        })
      } else if (entryModal === 'bill') {
        await addBill(userId, data)
      } else if (entryModal.startsWith('deposit:')) {
        const account = goals.find((item) => item.id === entryModal.slice('deposit:'.length))
        if (!account) throw new Error('Savings account is no longer available.')
        await depositToSavings(userId, account, Number(data.amount), data.source)
      }
      setConnectionError('')
      setEntryModal('')
    } catch (error) {
      setConnectionError(error.message || 'Could not save this entry')
    }
  }

  const handleBillPayment = async (bill) => {
    try {
      await payBill(userId, bill, 'Cash on Hand')
      setConnectionError('')
    } catch (error) {
      setConnectionError(error.message || 'Could not mark bill as paid')
    }

  }

  const openNewEntry = (kind) => setEntryModal(kind)

  const handleAccount = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    try {
      if (authMode === 'register') await registerAccount(email, password)
      else await loginAccount(email, password)
      setEntryModal('')
      setConnectionError('')
    } catch (error) {
      setConnectionError(
        error.code === 'auth/operation-not-allowed'
          ? 'Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication → Sign-in method.'
          : error.code === 'auth/invalid-api-key'
            ? 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY in .env and restart Vite.'
            : error.message || 'Could not update your account',
      )
    }
  }

  const requestAdvice = async (event) => {
    event.preventDefault()
    if (!auth.currentUser) {
      setConnectionError('Sign in to use the financial advisor.')
      return
    }
    setAdvisorLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const { getAIFinancialAdvice } = await import('./aiAdvisor')
      const advice = await getAIFinancialAdvice(idToken, {
        financialSummary: {
          income: budget.income,
          livingTarget: budget.livingTarget,
          livingActual: budget.livingActual,
          savingsTarget: budget.savingsTarget,
          savingsActual: budget.savingsActual,
          extraTarget: budget.extraTarget,
          extraActual: budget.extraActual,
        },
        balances: {
          available: Math.max(0, transactions.reduce((sum, transaction) => (
            sum + (transaction.type === 'SAVINGS'
              ? -Math.abs(transaction.amount)
              : transaction.amount)
          ), 0)),
          savings: goals.reduce((sum, goal) => sum + goal.balance, 0),
        },
        savingsAccounts: goals.map(({ name, category, balance, target, targetDate }) => ({
          name,
          category,
          balance,
          target,
          targetDate,
        })),
        debts: debts.map(({ name, type, total, paid, installmentAmount }) => ({
          name,
          type,
          total,
          paid,
          remaining: Math.max(0, total - paid),
          installmentAmount,
        })),
        bills: bills.map(({ name, category, amount, frequency, isPaid }) => ({
          name,
          category,
          amount: Number(amount || 0),
          frequency,
          isPaid: Boolean(isPaid),
        })),
        transactions: transactions.map(({
          id,
          name,
          category,
          amount,
          type,
          source,
          date,
          timestampMs,
        }) => ({
          id,
          name,
          category,
          amount,
          type,
          source,
          date,
          timestampMs,
        })),
      })
      setAdvisorResult(advice)
      setConnectionError('')
    } catch (error) {
      setConnectionError(error.message || 'Could not generate financial advice')
    } finally {
      setAdvisorLoading(false)
    }
  }

  const startUsingApp = () => {
    setShowLanding(false)
    if (userId) setActiveNav('overview')
    else setEntryModal('auth')
  }

  const copyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(appPublicUrl)
      setAppLinkCopied(true)
      setConnectionError('')
    } catch (error) {
      console.error('The PeraETrackMo link could not be copied:', error)
      setConnectionError('Could not copy the app link. Use the QR code or open the link directly.')
      setAppLinkCopied(false)
    }
  }

  const installApp = async () => {
    if (isInstalled) return
    if (!installPrompt) {
      setShowInstallHelp(true)
      return
    }

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setIsInstalled(true)
    } catch (error) {
      console.error('The browser install prompt could not be opened:', error)
      setShowInstallHelp(true)
    } finally {
      setInstallPrompt(null)
    }
  }

  if (showLanding) {
    return (
      <LandingPage
        user={auth.currentUser}
        theme={theme}
        onThemeToggle={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
        onStart={startUsingApp}
        onTutorial={() => { setShowLanding(false); setActiveNav('tutorial') }}
        onAbout={() => { setShowLanding(false); setActiveNav('about') }}
        onInstall={installApp}
        isInstalled={isInstalled}
        releaseInfo={releaseInfo}
        releaseError={releaseError}
      />
    )
  }

  return (
    <div className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => setShowLanding(true)} aria-label="Go to PeraETrackMo home">
         <span className="brand-mark"><img src="/peraetrackmo-mark.svg" alt="" /></span>
         <span>PeraETrackMo</span>
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={activeNav === item.id ? 'active' : ''}
                onClick={() => setActiveNav(item.id)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={() => setActiveNav('tutorial')}><CircleHelp size={19} /><span>Help & tutorial</span></button>
          <button onClick={() => setActiveNav('share')}><Share2 size={19} /><span>Share PeraETrackMo</span></button>
          <button><Settings size={19} /><span>Settings</span></button>
          <button className="profile profile-button" onClick={() => setEntryModal('auth')}>
            <AccountAvatar user={auth.currentUser} />
            <div><strong>{auth.currentUser?.email || 'Guest account'}</strong><span>{auth.currentUser?.isAnonymous ? 'Anonymous · link an email' : 'Firebase account'}</span></div>
            <ChevronDown size={17} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className={`eyebrow ${connectionError ? 'connection-error' : ''}`}>
              {connectionError || 'Saturday, November 22'}
            </p>
            <h1>{activeNav === 'overview' ? `Good morning${auth.currentUser?.displayName ? `, ${auth.currentUser.displayName.split(' ')[0]}` : ''}` : activeNav === 'share' ? 'Share PeraETrackMo' : navItems.find((item) => item.id === activeNav)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button share-mobile-button" aria-label="Share PeraETrackMo" title="Share PeraETrackMo" onClick={() => setActiveNav('share')}><Share2 size={18} /></button>
            <button className="icon-button" aria-label="Search"><Search size={19} /></button>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notice-dot" /></button>
            <button className="icon-button account-mobile-button" aria-label="Account" onClick={() => setEntryModal('auth')}><AccountAvatar user={auth.currentUser} compact /></button>
            <button
              className="icon-button"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              onClick={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button className="add-button" onClick={() => openNewEntry('transaction')}><Plus size={18} /> Add transaction</button>
          </div>
        </header>

        {activeNav === 'tutorial' && (
          <section className="tutorial-page">
            <div className="tutorial-intro">
              <span className="tutorial-kicker"><BookOpen size={15} /> QUICK START GUIDE</span>
              <h2>A few steps to feel at home.</h2>
              <p>Set up your account, add your money activity, then let PeraETrackMo help you follow your plan.</p>
            </div>
            <div className="tutorial-steps">
              <article className="tutorial-step">
                <span className="step-number">01</span><div><h3>Sign in to sync your data</h3><p>Create an email/password account or sign in from the account control. Your records are private to your Firebase account.</p><small>Before data sync works, Firebase Email/Password sign-in and Firestore rules must be enabled.</small></div>
                <button onClick={() => setEntryModal('auth')}>Account setup <ArrowRight size={15} /></button>
              </article>
              <article className="tutorial-step">
                <span className="step-number">02</span><div><h3>Record income and expenses</h3><p>Use <b>Add transaction</b> to record an amount, type, category, and source like GCash or Landbank. Your dashboard updates from saved transactions.</p><small>Tip: choose the matching transaction type so the 70/20/10 totals stay accurate.</small></div>
                <button onClick={() => { setActiveNav('transactions'); openNewEntry('transaction') }}>Add a transaction <ArrowRight size={15} /></button>
              </article>
              <article className="tutorial-step">
                <span className="step-number">03</span><div><h3>Make savings goals</h3><p>Add an account with a target and optional target date. Open Savings to see the 40/20/20/20 allocation and your daily, weekly, and monthly deposit pace.</p><small>Use Add deposit to increase a goal and record the savings transaction.</small></div>
                <button onClick={() => { setActiveNav('savings'); openNewEntry('savings') }}>Create a savings goal <ArrowRight size={15} /></button>
              </article>
              <article className="tutorial-step">
                <span className="step-number">04</span><div><h3>Track debts and bills</h3><p>Create debts to build a monthly installment schedule, or add bills to keep due dates handy. Pay and Collect create the corresponding ledger entry.</p><small>The first debt installment is scheduled one month after its start date.</small></div>
                <div className="tutorial-actions"><button onClick={() => { setActiveNav('debts'); openNewEntry('debt') }}>Add a debt <ArrowRight size={15} /></button><button onClick={() => { setActiveNav('bills'); openNewEntry('bill') }}>Add a bill <ArrowRight size={15} /></button></div>
              </article>
              <article className="tutorial-step">
                <span className="step-number">05</span><div><h3>Check your monthly plan</h3><p>The overview compares living costs, savings, and extra/support with the 70/20/10 targets calculated from your recorded income.</p><small>Optional: the AI Advisor can create suggestions from your summary when you provide a Gemini API key.</small></div>
                <button onClick={() => setActiveNav('overview')}>Go to overview <ArrowRight size={15} /></button>
              </article>
            </div>
            <div className="tutorial-finish"><CheckCircle2 size={18} /><span><strong>That’s the basics.</strong> You can return to this guide any time from Help & tutorial.</span></div>
          </section>
        )}

        {activeNav === 'about' && (
          <section className="about-page">
            <div className="about-intro">
              <span className="tutorial-kicker"><UserRound size={15} /> ABOUT PERAETRACKMO</span>
              <h2>Built to make money feel a little clearer.</h2>
              <p>PeraETrackMo brings everyday spending, savings goals, debts, and bills together in one place.</p>
            </div>
            <article className="about-developer-card">
              <div className="about-avatar" aria-hidden="true">KL</div>
              <div className="about-developer-copy">
                <span>DEVELOPER</span>
                <h3>Karl Michael Lopez</h3>
                <p>Visit my portfolio to learn more about my work and projects.</p>
                <a href="https://karlmichaellopez.vercel.app" target="_blank" rel="noopener noreferrer">
                  View my portfolio <ExternalLink size={16} />
                </a>
              </div>
            </article>
            <div className="about-note">
              <strong>Free for everyone</strong>
              <p>
                This application is free for everyone. If you’d like to support future improvements, any amount is appreciated. Thank you!
                <br /><strong>GCash:</strong> 09998901910
              </p>
            </div>
          </section>
        )}

        {activeNav === 'share' && (
          <section className="share-app-page page-panel">
            <div className="share-app-copy">
              <span className="tutorial-kicker"><Share2 size={15} /> SHARE PERAETRACKMO</span>
              <h2>Invite someone to take control of their money.</h2>
              <p>PeraETrackMo is free to visit. Share this QR code so anyone can open the app, explore it, and create their own private account.</p>
              <a href={appPublicUrl} target="_blank" rel="noopener noreferrer">{appPublicUrl} <ExternalLink size={15} /></a>
              <button className="add-button" onClick={copyAppLink}><Copy size={16} /> {appLinkCopied ? 'Link copied' : 'Copy app link'}</button>
            </div>
            <a className="share-app-qr" href={appPublicUrl} target="_blank" rel="noopener noreferrer" aria-label="Open the PeraETrackMo app">
            <img src="/perae-track-mo-app-qr.png" alt="QR code linking to the PeraETrackMo app" />
            <span>SCAN TO VISIT PERAETRACKMO</span>
            </a>
          </section>
        )}

        {activeNav === 'overview' && (
          <div className="dashboard">
            <section className="summary-grid">
              <article className="summary-card balance-card">
                <div className="card-heading"><span>Total balance</span><button><Download size={16} /></button></div>
                <strong>{peso(totals.balance)}</strong>
                <div className="trend"><TrendingUp size={14} /> 8.4% <span>from last month</span></div>
              </article>
              <article className="summary-card">
                <div className="card-heading"><span>Income</span><span className="metric-icon income"><TrendingUp size={17} /></span></div>
                <strong>{peso(totals.income)}</strong>
                <div className="metric-footer"><span>Monthly target</span><b>{peso(50000)}</b></div>
              </article>
              <article className="summary-card">
                <div className="card-heading"><span>Expenses</span><span className="metric-icon expense"><TrendingDown size={17} /></span></div>
                <strong>{peso(totals.expense)}</strong>
                <div className="metric-footer"><span>70% limit</span><b>{peso(35000)}</b></div>
              </article>
              <article className="summary-card">
                <div className="card-heading"><span>Savings</span><span className="metric-icon savings"><Target size={17} /></span></div>
                <strong>{peso(goals.reduce((sum, goal) => sum + goal.balance, 0))}</strong>
                <div className="metric-footer"><span>20% target</span><b>{peso(10000)}</b></div>
              </article>
            </section>

            <section className="panel rule-panel">
              <div className="panel-heading">
                <div><h2>Monthly money plan</h2><p>70 / 20 / 10 framework · actuals from your transactions</p></div>
              </div>
              <div className="rule-grid">
                {[
                  { name: 'Living & debt · 70%', target: budget.livingTarget, actual: budget.livingActual, tone: 'living' },
                  { name: 'Savings · 20%', target: budget.savingsTarget, actual: budget.savingsActual, tone: 'save' },
                  { name: 'Extra & support · 10%', target: budget.extraTarget, actual: budget.extraActual, tone: 'extra' },
                ].map((item) => {
                  const progress = item.target > 0 ? Math.min(100, (item.actual / item.target) * 100) : 0
                  return (
                    <div className="rule-item" key={item.name}>
                      <div className="rule-label"><strong>{item.name}</strong><span>{peso(item.actual)} <small>of {peso(item.target)}</small></span></div>
                      <div className="progress-track"><div className={item.tone} style={{ width: `${progress}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="middle-grid">
              <article className="panel cash-flow">
                <div className="panel-heading">
                  <div><h2>Cash flow</h2><p>Income and expenses</p></div>
                  <button className="period-button">This month <ChevronDown size={14} /></button>
                </div>
                <div className="chart">
                  <div className="y-axis">{cashFlowAxis.map((label, index) => <span key={index}>{label}</span>)}</div>
                  <div className="chart-area">
                    <div className="grid-lines"><i /><i /><i /><i /><i /></div>
                    <div className="bars">
                      {cashFlow.map((month) => (
                        <div className="bar-group" key={month.label}>
                          <div className="income-bar" style={{ height: `${(month.income / maxCashFlow) * 100}%` }} />
                          <div className="expense-bar" style={{ height: `${(month.expense / maxCashFlow) * 100}%` }} />
                          <span>{month.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="chart-legend"><span><i className="income-dot" /> Income</span><span><i className="expense-dot" /> Expenses</span></div>
              </article>

              <article className="panel category-panel">
                <div className="panel-heading"><div><h2>Spending by category</h2><p>November 2026</p></div><button className="dots-button">•••</button></div>
                <div className="donut-wrap">
                  <div className="donut" style={{ background: spendingDonut }}><div><strong>{peso(spendingByCategory.reduce((sum, category) => sum + category.amount, 0))}</strong><span>This month</span></div></div>
                  <div className="category-list">
                    {spendingByCategory.map((category) => (
                      <div key={category.name}><span><i style={{ background: category.color }} />{category.name}</span><strong>{category.value}%</strong></div>
                    ))}
                    {spendingByCategory.length === 0 && <p className="empty-note">No spending recorded this month.</p>}
                  </div>
                </div>
              </article>
            </section>

            <section className="bottom-grid">
              <article className="panel transactions-panel">
                <div className="panel-heading">
                  <div><h2>Recent transactions</h2><p>Latest account activity</p></div>
                  <button className="text-button" onClick={() => setActiveNav('transactions')}>View all</button>
                </div>
                <div className="transaction-list">
                  {transactions.slice(0, 5).map((tx) => (
                    <div className="transaction-row" key={tx.id}>
                      <div className={`transaction-icon ${tx.amount > 0 ? 'credit' : 'debit'}`}>
                        {tx.amount > 0 ? <TrendingUp size={18} /> : <ReceiptText size={18} />}
                      </div>
                      <div className="transaction-name"><strong>{tx.name}</strong><span>{tx.category} · {tx.source}</span></div>
                      <div className="transaction-date">{tx.date}</div>
                      <strong className={tx.amount > 0 ? 'positive' : ''}>{tx.amount > 0 ? '+' : '-'}{peso(Math.abs(tx.amount))}</strong>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="empty-note">Your transactions will appear here as you add them.</p>}
                </div>
              </article>

              <article className="panel savings-panel">
                <div className="panel-heading">
                  <div><h2>Savings goals</h2><p>Smart 40/20/20/20 allocation</p></div>
                  <button className="text-button" onClick={() => setActiveNav('savings')}>Manage</button>
                </div>
                <div className="savings-list">
                  {goals.map((goal) => {
                    const progress = Math.round((goal.balance / goal.target) * 100)
                    return (
                      <div className="goal-row" key={goal.id}>
                        <div className="goal-top"><span><i style={{ background: goal.color }} />{goal.name}</span><strong>{progress}%</strong></div>
                        <div className="progress-track"><div style={{ width: `${progress}%`, background: goal.color }} /></div>
                        <div className="goal-values"><b>{peso(goal.balance)}</b><span>of {peso(goal.target)}</span></div>
                      </div>
                    )
                  })}
                </div>
              </article>
            </section>
          </div>
        )}

        {activeNav === 'transactions' && (
          <section className="page-panel">
            <div className="page-toolbar">
              <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" /></label>
              <button className="add-button" onClick={() => openNewEntry('transaction')}><Plus size={18} /> Add transaction</button>
            </div>
            <div className="full-table">
              {filteredTransactions.map((tx) => (
                <div className="transaction-row" key={tx.id}>
                  <div className={`transaction-icon ${tx.amount > 0 ? 'credit' : 'debit'}`}>{tx.amount > 0 ? <TrendingUp size={18} /> : <ReceiptText size={18} />}</div>
                  <div className="transaction-name"><strong>{tx.name}</strong><span>{tx.category} · {tx.source}</span></div>
                  <div className="transaction-date">{tx.date}</div>
                  <strong className={tx.amount > 0 ? 'positive' : ''}>{tx.amount > 0 ? '+' : '-'}{peso(Math.abs(tx.amount))}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeNav === 'debts' && (
          <div className="page-stack">
            <div className="section-actions"><p>Installments are scheduled monthly, starting one month after the start date.</p><button className="add-button" onClick={() => openNewEntry('debt')}><Plus size={16} /> Add debt</button></div>
            <section className="debt-grid">
            {debts.map((debt) => (
              <article className="panel debt-card" key={debt.id}>
                <div className="debt-icon" style={{ background: `${debt.color}18`, color: debt.color }}><Landmark size={22} /></div>
                <div className="debt-title"><span>{debt.type === 'I_OWE' ? 'I owe' : 'They owe me'}</span><h2>{debt.name}</h2></div>
                <div className="goal-top"><span>Paid</span><strong>{Math.round((debt.paid / debt.total) * 100)}%</strong></div>
                <div className="progress-track"><div style={{ width: `${(debt.paid / debt.total) * 100}%`, background: debt.color }} /></div>
                <div className="debt-values"><strong>{peso(debt.paid)}</strong><span>of {peso(debt.total)}</span></div>
                <div className="debt-footer"><span>Next due <strong>{debt.due}</strong></span><button disabled={debt.raw?.isPaid || debt.paid >= debt.total} onClick={() => handleDebtAction(debt)}>{debt.type === 'I_OWE' ? 'Pay' : 'Collect'}</button></div>
              </article>
            ))}
            </section>
          </div>
        )}

        {activeNav === 'savings' && (
          <div className="page-stack">
            <section className="panel allocation-panel">
              <div className="panel-heading"><div><h2>Smart savings allocation</h2><p>Plan a balance or monthly savings contribution across your four buckets.</p></div></div>
              <div className="allocation-controls">
                <label>Allocate from<select value={allocationSource} onChange={(event) => { setAllocationSource(event.target.value); if (event.target.value !== 'Manual amount') setSavingAmount(Math.max(0, allocationSourceBalances[event.target.value] || 0)) }}><option>Manual amount</option><option>Total available</option>{[...new Set(transactions.map((transaction) => transaction.source).filter(Boolean))].map((source) => <option key={source}>{source}</option>)}</select></label>
                <label className="allocation-input">Amount to allocate <span>₱<input type="number" min="0" value={savingAmount} onChange={(event) => { setAllocationSource('Manual amount'); setSavingAmount(Math.max(0, Number(event.target.value))) }} /></span></label>
              </div>
              <div className="allocation-grid">
                {Object.entries(calculateSavingsAllocation(savingAmount)).map(([category, amount]) => (
                  <div className="allocation-item" key={category}><small>{category}</small><strong>{peso(amount)}</strong><span>{category === 'Emergency Fund' ? '40%' : '20%'}</span></div>
                ))}
              </div>
            </section>
            <section className="panel savings-management">
              <div className="panel-heading"><div><h2>Savings accounts</h2><p>Deposit targets and projected contribution pace</p></div><button className="add-button" onClick={() => openNewEntry('savings')}><Plus size={16} /> Add goal</button></div>
              {goals.length === 0 ? <p className="empty-note">No savings goals yet. Create one to start tracking your progress.</p> : (
                <div className="goal-cards">
                  {goals.map((goal) => {
                    const progress = goal.target > 0 ? Math.min(100, Math.round((goal.balance / goal.target) * 100)) : 0
                    const plan = calculateRequiredDeposits(goal)
                    return (
                      <article className="goal-card" key={goal.id}>
                        <div className="goal-top"><span><i style={{ background: goal.color }} />{goal.name}</span><strong>{progress}%</strong></div>
                        <div className="goal-values"><b>{peso(goal.balance)}</b><span>of {peso(goal.target)}</span></div>
                        <div className="progress-track"><div style={{ width: `${progress}%`, background: goal.color }} /></div>
                        <p className="goal-deadline">{goal.targetDate ? `${plan.daysLeft} days remaining` : 'No target date set'}</p>
                        {plan.daysLeft > 0 && <div className="deposit-plan"><span>Daily <b>{peso(plan.dailyNeeded)}</b></span><span>Weekly <b>{peso(plan.weeklyNeeded)}</b></span><span>Monthly <b>{peso(plan.monthlyNeeded)}</b></span></div>}
                        <button className="secondary-button" onClick={() => openNewEntry(`deposit:${goal.id}`)}>Add deposit</button>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeNav === 'bills' && (
          <section className="page-panel bills-page">
            <div className="panel-heading"><div><h2>Bills & recurring payments</h2><p>Track due dates and record payments to your transaction history.</p></div><button className="add-button" onClick={() => openNewEntry('bill')}><Plus size={16} /> Add bill</button></div>
            {bills.length === 0 ? <p className="empty-note">No bills yet. Add a bill to keep its amount and due date handy.</p> : (
              <div className="bill-list">
                {bills.map((bill) => {
                  const due = bill.dueDate?.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate)
                  return (
                    <div className="bill-row" key={bill.id}>
                      <span><strong>{bill.name}</strong><small>{bill.category} · {bill.frequency} · Due {Number.isNaN(due.getTime()) ? 'date unavailable' : due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</small></span>
                      <b>{peso(Number(bill.amount || 0))}</b>
                      {bill.isPaid ? <span className="paid-label">Paid</span> : <button className="secondary-button" onClick={() => handleBillPayment(bill)}>Mark paid</button>}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {activeNav === 'advisor' && (
          <div className="page-stack">
            <section className="page-panel advisor-page">
              <div className="placeholder-icon"><Sparkles size={26} /></div>
              <h2>Your personal money check-in</h2>
              <p>Get a roadmap based on your full transaction history, balances, savings goals, debts, and the 70/20/10 framework.</p>
              <form className="advisor-form" onSubmit={requestAdvice}>
                <small>Your financial summary and transaction history are sent securely to the configured AI service. Sign in is required; API credentials stay on the server.</small>
                <button className="add-button" disabled={advisorLoading || !userId}>{advisorLoading ? 'Generating…' : 'Generate advice'}</button>
              </form>
              {advisorResult && (
                <div className="advice-result">
                  <h3>Your roadmap</h3><p>{advisorResult.roadmap}</p>
                  <h3>Suggested goals</h3>{advisorResult.goals?.map((goal, index) => <div className="advice-goal" key={`${goal.category}-${index}`}><span>{goal.category}</span><strong>{peso(Number(goal.amount || 0))}</strong></div>)}
                  <h3>Weekly challenge</h3><p>{advisorResult.challenge}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {entryModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEntryModal('')}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><p>{entryModal === 'auth' ? 'Firebase account' : 'New entry'}</p><h2>{entryModal === 'auth' ? 'Sign in or create an account' : entryModal === 'savings' ? 'Create savings goal' : entryModal === 'debt' ? 'Add debt or loan' : entryModal === 'bill' ? 'Add bill' : entryModal.startsWith('deposit:') ? 'Add savings deposit' : 'Add transaction'}</h2></div>
              <button onClick={() => setEntryModal('')} aria-label="Close"><X size={20} /></button>
            </div>
            {entryModal === 'transaction' && (
              <form onSubmit={addTransaction}>
                <label>Description<input name="name" required placeholder="e.g. Grocery shopping" /></label>
                <div className="form-row">
                  <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label>
                  <label>Type<select name="kind"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option><option value="SALARY">Salary</option><option value="ALLOWANCE">Allowance</option><option value="SAVINGS">Savings</option><option value="BILL_PAYMENT">Bill payment</option><option value="SUBSCRIPTION">Subscription</option><option value="WIRED_TRANSFER">Wired transfer</option><option value="ADJUSTMENT">Adjustment</option></select></label>
                </div>
                <div className="form-row">
                  <label>Category<select name="category"><optgroup label="Expenses"><option>Food</option><option>Transportation</option><option>Drinks</option><option>Entertainment</option><option>Personal Needs</option><option>Others</option></optgroup><optgroup label="Subscriptions"><option>Mobile Data</option><option>Internet</option><option>Postpaid</option><option>Streaming Sites</option><option>AI Subscriptions</option><option>Other Subscriptions</option></optgroup><optgroup label="Bills"><option>Electricity</option><option>Water</option><option>Rent</option></optgroup><optgroup label="Income"><option>Allowance</option><option>Salary</option><option>Freelance</option><option>Business</option><option>Gift / Bonus</option></optgroup></select></label>
                  <label>Source<select name="source"><option>GCash</option><option>Landbank</option><option>GoTyme</option><option>Cash on Hand</option></select></label>
                </div>
                <button className="submit-button" type="submit">Save transaction</button>
              </form>
            )}
            {showInstallHelp && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowInstallHelp(false)}>
                <section className="modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-heading">
                    <div><p>PERAETRACKMO WEB APP</p><h2 id="install-title">Add PeraETrackMo to your home screen</h2></div>
                    <button onClick={() => setShowInstallHelp(false)} aria-label="Close"><X size={20} /></button>
                  </div>
                  <div className="install-instructions">
                    <div><span>1</span><p>Open this site in <strong>Chrome</strong> on your Android phone.</p></div>
                    <div><span>2</span><p>Tap the browser <strong>⋮ menu</strong> in the top corner.</p></div>
                    <div><span>3</span><p>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then confirm.</p></div>
                  </div>
                  <p className="install-note"><Smartphone size={16} /> This installs the web app. Use “Download Android APK” for the native Android release.</p>
                  <button className="submit-button" onClick={() => setShowInstallHelp(false)}>Got it</button>
                </section>
              </div>
            )}
            {entryModal === 'savings' && (
              <form onSubmit={handleCreate}>
                <label>Goal name<input name="name" required placeholder="e.g. Emergency fund" /></label>
                <div className="form-row"><label>Target amount<input name="targetAmount" type="number" min="1" required /></label><label>Current balance<input name="currentBalance" type="number" min="0" defaultValue="0" required /></label></div>
                <div className="form-row"><label>Category<select name="category"><option>Emergency Fund</option><option>Buffer Balance</option><option>Motorcycle Goal</option><option>Extra / Wants</option><option>General</option></select></label><label>Target date<input name="targetDate" type="date" /></label></div>
                <button className="submit-button" type="submit">Create savings goal</button>
              </form>
            )}
            {entryModal.startsWith('deposit:') && (
              <form onSubmit={handleCreate}>
                <label>Deposit amount<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                <label>From source<select name="source"><option>GCash</option><option>Landbank</option><option>GoTyme</option><option>Cash on Hand</option></select></label>
                <button className="submit-button" type="submit">Record deposit</button>
              </form>
            )}
            {entryModal === 'debt' && (
              <form onSubmit={handleCreate}>
                <label>Name<input name="name" required placeholder="Person or lender" /></label>
                <div className="form-row"><label>Debt type<select name="debtType"><option value="I_OWE">I owe (borrowed)</option><option value="THEY_OWE_ME">They owe me (lent)</option></select></label><label>Principal amount<input name="principalAmount" type="number" min="0.01" required /></label></div>
                <div className="form-row"><label>Installment amount<input name="installmentAmount" type="number" min="0.01" required /></label><label>Number of months<input name="totalMonths" type="number" min="1" max="600" required /></label></div>
                <div className="form-row"><label>Interest rate (%)<input name="interestRate" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Start date<input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label></div>
                <label>Cash source<select name="source"><option>Cash on Hand</option><option>GCash</option><option>Landbank</option><option>GoTyme</option></select></label>
                <button className="submit-button" type="submit">Create debt schedule</button>
              </form>
            )}
            {entryModal === 'bill' && (
              <form onSubmit={handleCreate}>
                <label>Bill name<input name="name" required placeholder="e.g. Electricity" /></label>
                <div className="form-row"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Due date<input name="dueDate" type="date" required /></label></div>
                <div className="form-row"><label>Frequency<select name="frequency"><option>Monthly</option><option>Weekly</option><option>Yearly</option></select></label><label>Category<select name="category"><option>Electricity</option><option>Water</option><option>Rent</option><option>Internet</option><option>Other</option></select></label></div>
                <button className="submit-button" type="submit">Save bill</button>
              </form>
            )}
            {entryModal === 'auth' && (
              <form onSubmit={handleAccount}>
                <div className="account-avatar-preview"><AccountAvatar user={auth.currentUser} /><span><strong>{auth.currentUser?.displayName || auth.currentUser?.email || 'Your account'}</strong><small>{auth.currentUser?.email || 'Not signed in yet'}</small></span></div>
                <p className="auth-description">{auth.currentUser?.isAnonymous ? 'Create an email account to link it to this anonymous profile and keep its Firebase data.' : auth.currentUser ? 'Manage your Firebase account.' : 'Create an email/password account or sign in to sync your data.'}</p>
                <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
                <label>Password<input name="password" type="password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength="6" required /></label>
                {authMode === 'register' && (
                  <label className="eula-consent">
                    <input name="acceptEula" type="checkbox" required />
                    <span>I agree to the <a href="/eula.html" target="_blank" rel="noopener noreferrer">End User License Agreement</a>.</span>
                  </label>
                )}
                <button className="submit-button" type="submit">{authMode === 'register' ? 'Create / link account' : 'Sign in'}</button>
                <button className="auth-switch" type="button" onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>{authMode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Create one'}</button>
                {auth.currentUser && !auth.currentUser.isAnonymous && <button className="auth-switch" type="button" onClick={async () => { await logoutAccount(); setEntryModal('') }}>Sign out</button>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
