'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  House,
  Lightbulb,
  LogOut,
  Mic,
  Moon,
  Plus,
  Receipt,
  Settings2,
  Sun,
  Target,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import { addBudget, addEntry, addFixedExpense, addGoal, addGoalContribution, removeEntry } from '@/app/actions'
import { authClient } from '@/lib/auth-client'
import type { budgets, expenseEntries, fixedExpenses, savingsGoals } from '@/lib/db/schema'

type Entry = typeof expenseEntries.$inferSelect
type Budget = typeof budgets.$inferSelect
type GoalItem = typeof savingsGoals.$inferSelect
type FixedExpense = typeof fixedExpenses.$inferSelect

type DashboardData = {
  entries: Entry[]
  budgets: Budget[]
  goals: GoalItem[]
  fixedExpenses: FixedExpense[]
  summary: {
    balance: number
    monthlyIncome: number
    monthlyExpenses: number
    previousPeriodExpenses: number
    categorySpending: { category: string; amount: number }[]
  }
}
type User = { name: string; email: string; image?: string | null }
type ModalKind = 'entry' | 'budget' | 'goal' | 'fixed' | 'contribution' | null
type View = 'home' | 'activity' | 'insights' | 'settings'
type SpeechRecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  start: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
const currency = (value: number | string, language: string) => new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(Number(value) || 0)

export function Dashboard({ user, initialData }: { user: User; initialData: DashboardData }) {
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const [modal, setModal] = useState<ModalKind>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const [dark, setDark] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [hidden, setHidden] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isEs = language === 'es'
  const monthlyIncome = initialData.summary.monthlyIncome
  const monthlyExpenses = initialData.summary.monthlyExpenses
  const balance = initialData.summary.balance
  const displayMoney = (amount: number | string) => hidden ? '••••••' : currency(amount, language)

  function startVoiceDictation() {
    const browserWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceStatus(isEs ? 'El dictado por voz no está disponible en este navegador.' : 'Voice dictation is not available in this browser.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = isEs ? 'es-MX' : 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim()
      if (transcript && titleInputRef.current) {
        titleInputRef.current.value = transcript
        setVoiceStatus(isEs ? 'Texto reconocido. Revisa la descripción antes de guardar.' : 'Speech recognized. Review the description before saving.')
      }
    }
    recognition.onerror = () => setVoiceStatus(isEs ? 'No se reconoció la voz. Puedes escribir la descripción.' : 'Speech was not recognized. You can type the description.')
    setVoiceStatus(isEs ? 'Escuchando…' : 'Listening…')
    recognition.start()
  }

  async function submitModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!modal) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    let uploadedReceiptPath: string | undefined
    try {
      let result: { ok: boolean; message?: string }
      if (modal === 'entry') {
        const receipt = form.get('receipt')
        if (receipt instanceof File && receipt.size > 0) {
          const uploadData = new FormData()
          uploadData.append('file', receipt)
          const uploadResponse = await fetch('/api/receipts', { method: 'POST', body: uploadData })
          if (!uploadResponse.ok) {
            setError(isEs ? 'No se pudo guardar la foto. Inténtalo de nuevo.' : 'Could not save the photo. Please try again.')
            return
          }
          const uploaded = await uploadResponse.json() as { pathname: string }
          uploadedReceiptPath = uploaded.pathname
        }
        result = await addEntry({
          title: String(form.get('title') ?? ''),
          category: String(form.get('category') ?? ''),
          type: String(form.get('type')) === 'income' ? 'income' : 'expense',
          amount: Number(form.get('amount')),
          receiptPath: uploadedReceiptPath,
        })
      } else if (modal === 'budget') {
        result = await addBudget({ category: String(form.get('category') ?? ''), monthlyLimit: Number(form.get('amount')) })
      } else if (modal === 'goal') {
        result = await addGoal({ title: String(form.get('title') ?? ''), targetAmount: Number(form.get('amount')) })
      } else if (modal === 'contribution') {
        result = await addGoalContribution({ goalId: selectedGoalId ?? '', amount: Number(form.get('amount')) })
      } else {
        result = await addFixedExpense({
          title: String(form.get('title') ?? ''),
          category: String(form.get('category') ?? ''),
          amount: Number(form.get('amount')),
          dueDay: Number(form.get('dueDay')),
        })
      }
      if (!result.ok) {
        if (uploadedReceiptPath) {
          await fetch('/api/receipts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pathname: uploadedReceiptPath }),
          })
        }
        setError(result.message || (isEs ? 'No se pudo guardar. Revisa los datos.' : 'Could not save. Check the details.'))
        return
      }
      setModal(null)
      router.refresh()
    } catch {
      if (uploadedReceiptPath) {
        await fetch('/api/receipts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pathname: uploadedReceiptPath }),
        }).catch(() => undefined)
      }
      setError(isEs ? 'No se pudo guardar. Inténtalo de nuevo.' : 'Could not save. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm(isEs ? '¿Eliminar este movimiento?' : 'Delete this transaction?')) return
    await removeEntry(id)
    router.refresh()
  }

  async function signOut() {
    setSigningOut(true)
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  const navItems: { id: View; label: string; icon: typeof House }[] = [
    { id: 'home', label: isEs ? 'Inicio' : 'Home', icon: House },
    { id: 'activity', label: isEs ? 'Movimientos' : 'Activity', icon: Receipt },
    { id: 'insights', label: isEs ? 'Análisis' : 'Insights', icon: Lightbulb },
    { id: 'settings', label: isEs ? 'Ajustes' : 'Settings', icon: Settings2 },
  ]

  const shell = dark ? 'bg-[#061a30] text-white' : 'bg-[#f5f7fa] text-[#12243a]'
  const card = dark ? 'bg-[#0c2946]' : 'bg-white shadow-sm'
  const muted = dark ? 'text-white/55' : 'text-[#5c6b7c]'
  const monthName = new Intl.DateTimeFormat(isEs ? 'es-MX' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date())
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dueSoon = initialData.fixedExpenses.map((expense) => {
    const dateForMonth = (year: number, month: number) => {
      const due = new Date(year, month, 1)
      due.setDate(Math.min(expense.dueDay, new Date(year, month + 1, 0).getDate()))
      return due
    }
    let dueDate = dateForMonth(today.getFullYear(), today.getMonth())
    if (dueDate < todayStart) dueDate = dateForMonth(today.getFullYear(), today.getMonth() + 1)
    return { ...expense, daysUntil: Math.round((dueDate.getTime() - todayStart.getTime()) / 86_400_000) }
  }).filter((expense) => expense.daysUntil <= 7)

  return (
    <main className={`min-h-screen ${shell}`}>
      <div className="mx-auto min-h-screen max-w-[480px] overflow-hidden border-x border-black/5 bg-inherit shadow-2xl">
        <header className="flex items-center justify-between px-5 pb-3 pt-5">
          <div className="flex items-center gap-2 text-lg font-black tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-[#fcb515] text-[#061a30]">T</span><span><b className="text-[#fcb515]">Tra</b>kealo</span></div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setLanguage(isEs ? 'en' : 'es')} aria-label={isEs ? 'Cambiar idioma a inglés' : 'Change language to Spanish'} className={`rounded-xl px-2 py-2 text-xs font-bold ${muted}`}>{language.toUpperCase()}</button>
            <button type="button" onClick={() => setHidden((value) => !value)} aria-label={hidden ? (isEs ? 'Mostrar montos' : 'Show amounts') : (isEs ? 'Ocultar montos' : 'Hide amounts')} className={`rounded-xl p-2 ${muted}`}><span aria-hidden="true">{hidden ? '••' : '$'}</span></button>
          </div>
        </header>

        {view === 'home' && <>
          <section className="px-5 pb-5 pt-3">
            <div className="mb-5 flex items-end justify-between gap-3"><div className="min-w-0"><p className={`truncate text-sm ${muted}`}>{isEs ? `Hola, ${user.name.split(' ')[0]}` : `Hi, ${user.name.split(' ')[0]}`}</p><h1 className="mt-1 text-[26px] font-bold tracking-tight">{isEs ? 'Tus finanzas, claras.' : 'Your money, in view.'}</h1></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#fcb515]/15 text-[#fcb515]"><Bell className="size-5" /></div></div>
            <div className="rounded-[28px] bg-gradient-to-br from-[#123c61] to-[#0c2946] p-5 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between"><span className="text-sm text-white/60">{isEs ? 'Balance registrado' : 'Recorded balance'}</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/65">{isEs ? 'Desde el inicio' : 'All time'}</span></div>
              <p className="mt-2 text-[34px] font-black tracking-tight">{displayMoney(balance)}</p>
              <p className="mt-1 text-xs text-white/45">{initialData.entries.length === 0 ? (isEs ? 'Agrega tu primer movimiento para comenzar' : 'Add your first transaction to get started') : (isEs ? 'Calculado con tus movimientos guardados' : 'Calculated from your saved transactions')}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><span className="text-xs text-white/50">{isEs ? 'Ingresos del mes' : 'Monthly income'}</span><p className="mt-1 font-semibold text-[#6ee7b7]">{displayMoney(monthlyIncome)}</p></div><div><span className="text-xs text-white/50">{isEs ? 'Gastos del mes' : 'Monthly expenses'}</span><p className="mt-1 font-semibold text-[#fb8c8c]">{displayMoney(monthlyExpenses)}</p></div></div>
            </div>
          </section>
          {dueSoon.length > 0 && <section className="flex flex-col gap-2 px-5 pb-4" aria-label={isEs ? 'Próximos pagos fijos' : 'Upcoming fixed payments'}>{dueSoon.map((expense) => <div key={expense.id} role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-[#fcb515]/25 bg-[#fcb515]/10 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><CalendarDays className="size-4 shrink-0 text-[#fcb515]" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{expense.title}</p><p className={`text-xs ${muted}`}>{expense.daysUntil === 0 ? (isEs ? 'Vence hoy' : 'Due today') : isEs ? `Vence en ${expense.daysUntil} días` : `Due in ${expense.daysUntil} days`}</p></div></div><p className="shrink-0 text-sm font-bold">{displayMoney(expense.amount)}</p></div>)}</section>}
          <div className="flex items-center justify-between px-5 pb-3"><h2 className="font-bold capitalize">{monthName}</h2><button type="button" onClick={() => setView('activity')} className="text-xs font-semibold text-[#fcb515]">{isEs ? 'Ver todo' : 'See all'}</button></div>
          <section className="grid grid-cols-2 gap-3 px-5">
            <article className={`rounded-3xl p-4 ${card}`}><div className="mb-4 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-2xl bg-[#fcb515]/15 text-[#fcb515]"><WalletCards className="size-5" /></span><span className="text-xs text-white/45">{initialData.budgets.length}</span></div><p className={`text-xs ${muted}`}>{isEs ? 'Presupuestos' : 'Budgets'}</p><p className="mt-1 text-lg font-bold">{initialData.budgets.length}</p><button type="button" onClick={() => setModal('budget')} className="mt-2 text-xs font-bold text-[#fcb515]">{isEs ? 'Crear presupuesto' : 'Add a budget'}</button></article>
            <article className={`rounded-3xl p-4 ${card}`}><div className="mb-4 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-2xl bg-[#a78bfa]/15 text-[#a78bfa]"><Target className="size-5" /></span><span className="text-xs text-white/45">{initialData.goals.length}</span></div><p className={`text-xs ${muted}`}>{isEs ? 'Metas de ahorro' : 'Savings goals'}</p><p className="mt-1 text-lg font-bold">{initialData.goals.length}</p><button type="button" onClick={() => setModal('goal')} className="mt-2 text-xs font-bold text-[#c4b5fd]">{isEs ? 'Crear meta' : 'Add a goal'}</button></article>
          </section>
          {(initialData.budgets.length > 0 || initialData.goals.length > 0) && <section className="px-5 pt-5"><h2 className="mb-3 font-bold">{isEs ? 'Tu plan' : 'Your plan'}</h2><div className="flex flex-col gap-3">{initialData.budgets.map((budget) => { const spent = initialData.summary.categorySpending.find((item) => item.category.toLowerCase() === budget.category.toLowerCase())?.amount ?? 0; const progress = Math.min(100, Math.round((spent / Number(budget.monthlyLimit)) * 100)); return <article key={budget.id} className={`rounded-3xl p-4 ${card}`}><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold">{budget.category}</p><p className="shrink-0 text-xs">{displayMoney(spent)} <span className={muted}>/ {displayMoney(budget.monthlyLimit)}</span></p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#fcb515]" style={{ width: `${progress}%` }} /></div><p className={`mt-2 text-[11px] ${muted}`}>{progress}% {isEs ? 'del límite mensual' : 'of monthly limit'}</p></article> })}{initialData.goals.map((goal) => { const progress = Math.min(100, Math.round((Number(goal.savedAmount) / Number(goal.targetAmount)) * 100)); return <article key={goal.id} className={`rounded-3xl p-4 ${card}`}><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold">{goal.title}</p><p className="shrink-0 text-xs">{displayMoney(goal.savedAmount)} <span className={muted}>/ {displayMoney(goal.targetAmount)}</span></p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#a78bfa]" style={{ width: `${progress}%` }} /></div><p className={`mt-2 text-[11px] ${muted}`}>{progress}% {isEs ? 'de la meta' : 'of goal'}</p><button type="button" onClick={() => { setSelectedGoalId(goal.id); setModal('contribution') }} className="mt-3 text-xs font-bold text-[#c4b5fd]">{isEs ? 'Añadir ahorro' : 'Add savings'}</button></article> })}</div></section>}
          <section className={`mx-5 mt-4 rounded-3xl border border-[#fcb515]/25 bg-[#fcb515]/10 p-4`}><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#fcb515] text-[#061a30]"><CalendarDays className="size-5" /></span><div className="flex-1"><p className="text-sm font-bold">{isEs ? 'Gastos fijos' : 'Recurring expenses'}</p>{initialData.fixedExpenses.length ? <><p className={`mt-1 text-xs ${muted}`}>{initialData.fixedExpenses.length} {isEs ? 'registrados' : 'saved'}</p><button type="button" onClick={() => setView('activity')} className="mt-3 text-xs font-bold text-[#fcb515]">{initialData.fixedExpenses[0].title} · {displayMoney(initialData.fixedExpenses[0].amount)} · {isEs ? `día ${initialData.fixedExpenses[0].dueDay}` : `day ${initialData.fixedExpenses[0].dueDay}`}</button></> : <><p className={`mt-1 text-xs ${muted}`}>{isEs ? 'Todavía no tienes pagos recurrentes.' : 'No recurring payments yet.'}</p><button type="button" onClick={() => setModal('fixed')} className="mt-3 text-xs font-bold text-[#fcb515]">{isEs ? 'Agregar gasto fijo' : 'Add recurring expense'} <ChevronRight className="ml-1 inline size-3" /></button></>}</div></div></section>
          <section className="px-5 pb-28 pt-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{isEs ? 'Actividad reciente' : 'Recent activity'}</h2><button type="button" onClick={() => setView('activity')} className="text-xs font-semibold text-[#fcb515]">{isEs ? 'Ver todo' : 'See all'}</button></div><EntryList entries={initialData.entries.slice(0, 4)} language={language} hidden={hidden} onDelete={deleteEntry} muted={muted} card={card} emptyText={isEs ? 'Tus movimientos aparecerán aquí cuando registres uno.' : 'Your transactions will appear here after you add one.'} /></section>
        </>}

        {view === 'activity' && <section className="px-5 pb-28 pt-5"><p className={`text-xs font-bold uppercase tracking-[0.18em] text-[#fcb515]`}>{isEs ? 'Tu historial' : 'Your history'}</p><h1 className="mt-2 text-3xl font-bold">{isEs ? 'Movimientos' : 'Activity'}</h1><p className={`mt-2 text-sm ${muted}`}>{isEs ? 'Solo tú puedes ver los datos de tu cuenta.' : 'Only you can see the data in your account.'}</p><div className="mt-6"><EntryList entries={initialData.entries} language={language} hidden={hidden} onDelete={deleteEntry} muted={muted} card={card} emptyText={isEs ? 'Todavía no hay movimientos. Registra el primero con el botón +.' : 'No transactions yet. Add your first one with the + button.'} /></div></section>}

        {view === 'insights' && <section className="px-5 pb-28 pt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fcb515]">{isEs ? 'Basado en tus datos' : 'Based on your data'}</p><h1 className="mt-2 text-3xl font-bold">{isEs ? 'Análisis' : 'Insights'}</h1><p className={`mt-2 text-sm ${muted}`}>{isEs ? 'Tendencias calculadas solo con los movimientos de tu cuenta.' : 'Trends calculated only from transactions in your account.'}</p><div className={`mt-6 rounded-3xl p-5 ${card}`}><Lightbulb className="size-6 text-[#fcb515]" /><h2 className="mt-4 font-bold">{monthlyExpenses > 0 ? (isEs ? 'Gastos de este mes' : 'This month’s spending') : (isEs ? 'Aún estamos empezando' : 'Just getting started')}</h2><p className={`mt-2 text-sm leading-6 ${muted}`}>{monthlyExpenses === 0 ? (isEs ? 'Registra tus movimientos para ver un resumen real de tus hábitos.' : 'Add transactions to see a real summary of your habits.') : initialData.summary.previousPeriodExpenses > 0 ? (isEs ? `Has gastado ${displayMoney(monthlyExpenses)}. Eso es ${Math.abs(Math.round(((monthlyExpenses - initialData.summary.previousPeriodExpenses) / initialData.summary.previousPeriodExpenses) * 100))}% ${monthlyExpenses > initialData.summary.previousPeriodExpenses ? 'más' : 'menos'} que en los mismos días del mes pasado.` : `You spent ${displayMoney(monthlyExpenses)}, ${Math.abs(Math.round(((monthlyExpenses - initialData.summary.previousPeriodExpenses) / initialData.summary.previousPeriodExpenses) * 100))}% ${monthlyExpenses > initialData.summary.previousPeriodExpenses ? 'more' : 'less'} than during the same days last month.`) : (isEs ? `Has registrado ${displayMoney(monthlyExpenses)} en gastos este mes. Cuando tengas datos del mes pasado, podrás comparar tendencias.` : `You have recorded ${displayMoney(monthlyExpenses)} in expenses this month. Once there is data from last month, you can compare trends.`)}</p>{initialData.summary.categorySpending[0] && <p className={`mt-4 border-t border-white/10 pt-4 text-sm ${muted}`}>{isEs ? 'Tu categoría con más gastos este mes:' : 'Your highest-spending category this month:'} <strong className="text-white">{initialData.summary.categorySpending[0].category}</strong> · {displayMoney(initialData.summary.categorySpending[0].amount)}</p>}</div></section>}

        {view === 'settings' && <section className="px-5 pb-28 pt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fcb515]">{isEs ? 'Tu cuenta' : 'Your account'}</p><h1 className="mt-2 text-3xl font-bold">{isEs ? 'Ajustes' : 'Settings'}</h1><div className={`mt-6 flex items-center gap-3 rounded-3xl p-4 ${card}`}><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fcb515] font-bold text-[#061a30]">{user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : user.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold">{user.name}</p><p className={`truncate text-sm ${muted}`}>{user.email}</p></div></div><div className={`mt-3 divide-y divide-white/10 rounded-3xl px-4 ${card}`}><button type="button" onClick={() => setLanguage(isEs ? 'en' : 'es')} className="flex w-full items-center justify-between py-4 text-sm"><span>{isEs ? 'Idioma' : 'Language'}</span><span className={muted}>{isEs ? 'Español' : 'English'}</span></button><button type="button" onClick={() => setDark((value) => !value)} className="flex w-full items-center justify-between py-4 text-sm"><span>{isEs ? 'Apariencia' : 'Appearance'}</span><span className={`flex items-center gap-2 ${muted}`}>{dark ? <Moon className="size-4" /> : <Sun className="size-4" />}{dark ? (isEs ? 'Oscuro' : 'Dark') : (isEs ? 'Claro' : 'Light')}</span></button><button type="button" onClick={signOut} disabled={signingOut} className="flex w-full items-center gap-2 py-4 text-sm font-semibold text-rose-400 disabled:opacity-60"><LogOut className="size-4" />{signingOut ? (isEs ? 'Cerrando sesión…' : 'Signing out…') : (isEs ? 'Cerrar sesión' : 'Sign out')}</button></div><div className={`mt-5 rounded-2xl p-4 text-xs leading-5 ${muted}`}>{isEs ? 'Tus movimientos, presupuestos y metas se guardan de forma privada en tu cuenta.' : 'Your transactions, budgets, and goals are stored privately in your account.'}</div></section>}

        <button type="button" onClick={() => setModal('entry')} className="fixed bottom-24 right-5 z-20 grid size-14 place-items-center rounded-2xl bg-[#fcb515] text-[#061a30] shadow-lg shadow-[#fcb515]/25 transition hover:scale-105" aria-label={isEs ? 'Registrar movimiento' : 'Add transaction'}><Plus className="size-7" /></button>
        <nav aria-label={isEs ? 'Navegación principal' : 'Main navigation'} className={`fixed bottom-0 left-1/2 z-10 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-white/8 px-1 py-3 backdrop-blur-xl ${dark ? 'bg-[#061a30]/95' : 'bg-white/95'}`}>
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold ${view === id ? 'text-[#fcb515]' : muted}`}><Icon className="size-5" /><span>{label}</span></button>)}
        </nav>

        {modal && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/65 p-3 sm:items-center" onClick={() => setModal(null)}><section role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-[30px] bg-[#0c2946] p-5 text-white shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-bold" id="modal-title">{modal === 'entry' ? (isEs ? 'Nuevo movimiento' : 'New transaction') : modal === 'budget' ? (isEs ? 'Nuevo presupuesto' : 'New budget') : modal === 'goal' ? (isEs ? 'Nueva meta' : 'New goal') : modal === 'contribution' ? (isEs ? 'Añadir ahorro' : 'Add savings') : (isEs ? 'Gasto fijo' : 'Recurring expense')}</p><p className="mt-1 text-xs text-white/50">{isEs ? 'Se guardará solo en tu cuenta.' : 'Saved only to your account.'}</p></div><button type="button" aria-label={isEs ? 'Cerrar' : 'Close'} onClick={() => setModal(null)} className="rounded-xl bg-white/5 p-2"><X className="size-5" /></button></div><form onSubmit={submitModal} className="flex flex-col gap-4">
          {(modal === 'entry' || modal === 'goal' || modal === 'fixed') && <div className="flex flex-col gap-2 text-sm font-medium"><label htmlFor="entry-title">{modal === 'entry' ? (isEs ? 'Descripción' : 'Description') : modal === 'goal' ? (isEs ? 'Nombre de la meta' : 'Goal name') : (isEs ? 'Nombre del gasto' : 'Expense name')}</label><div className="flex gap-2"><input ref={modal === 'entry' || modal === 'goal' || modal === 'fixed' ? titleInputRef : undefined} id="entry-title" required name="title" maxLength={100} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#061a30] px-4 py-3 outline-none focus:border-[#fcb515]" placeholder={modal === 'goal' ? (isEs ? 'Ej. Viaje' : 'e.g. Trip') : (isEs ? 'Ej. Supermercado' : 'e.g. Groceries')} />{modal === 'entry' && <button type="button" onClick={startVoiceDictation} aria-label={isEs ? 'Dictar descripción por voz' : 'Dictate description by voice'} className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-[#fcb515] hover:bg-white/15"><Mic className="size-5" /></button>}</div>{modal === 'entry' && <p role="status" className="text-xs font-normal text-white/50">{voiceStatus || (isEs ? 'Puedes dictar la descripción; el monto se confirma manualmente.' : 'You can dictate the description; confirm the amount manually.')}</p>}</div>}
          {(modal === 'entry' || modal === 'fixed' || modal === 'budget') && <label className="flex flex-col gap-2 text-sm font-medium">{isEs ? 'Categoría' : 'Category'}<input required name="category" maxLength={60} className="rounded-xl border border-white/10 bg-[#061a30] px-4 py-3 outline-none focus:border-[#fcb515]" placeholder={isEs ? 'Ej. Comida' : 'e.g. Food'} /></label>}
          {modal === 'entry' && <label className="flex flex-col gap-2 text-sm font-medium">{isEs ? 'Tipo' : 'Type'}<select name="type" className="rounded-xl border border-white/10 bg-[#061a30] px-4 py-3 outline-none focus:border-[#fcb515]"><option value="expense">{isEs ? 'Gasto' : 'Expense'}</option><option value="income">{isEs ? 'Ingreso' : 'Income'}</option></select></label>}
          <label className="flex flex-col gap-2 text-sm font-medium">{modal === 'budget' ? (isEs ? 'Límite mensual' : 'Monthly limit') : modal === 'goal' ? (isEs ? 'Monto objetivo' : 'Target amount') : modal === 'contribution' ? (isEs ? 'Ahorro que vas a añadir' : 'Savings to add') : (isEs ? 'Monto' : 'Amount')}<input required name="amount" type="number" min="0.01" max="1000000000" step="0.01" inputMode="decimal" className="rounded-xl border border-white/10 bg-[#061a30] px-4 py-3 outline-none focus:border-[#fcb515]" placeholder="0.00" /></label>
          {modal === 'entry' && <label className="flex flex-col gap-2 text-sm font-medium"><span>{isEs ? 'Foto del recibo (opcional)' : 'Receipt photo (optional)'}</span><input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="rounded-xl border border-white/10 bg-[#061a30] px-3 py-2.5 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-semibold file:text-white" /><span className="text-xs font-normal text-white/50">{isEs ? 'JPEG, PNG o WebP · máximo 8 MB · privado' : 'JPEG, PNG, or WebP · up to 8 MB · private'}</span></label>}
          {modal === 'fixed' && <label className="flex flex-col gap-2 text-sm font-medium">{isEs ? 'Día de vencimiento' : 'Due day'}<input required name="dueDay" type="number" min="1" max="31" step="1" className="rounded-xl border border-white/10 bg-[#061a30] px-4 py-3 outline-none focus:border-[#fcb515]" placeholder="1–31" /></label>}
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button type="submit" disabled={pending} className="mt-1 min-h-12 rounded-2xl bg-[#fcb515] px-5 font-bold text-[#061a30] disabled:opacity-60">{pending ? (isEs ? 'Guardando…' : 'Saving…') : (isEs ? 'Guardar' : 'Save')}</button>
        </form></section></div>}
      </div>
    </main>
  )
}

function EntryList({ entries, language, hidden, onDelete, muted, card, emptyText }: {
  entries: Entry[]
  language: 'es' | 'en'
  hidden: boolean
  onDelete: (id: string) => void
  muted: string
  card: string
  emptyText: string
}) {
  if (entries.length === 0) return <div className={`rounded-3xl p-5 text-sm leading-6 ${card} ${muted}`}>{emptyText}</div>
  return <div className="flex flex-col gap-2">{entries.map((entry) => {
    const income = entry.type === 'income'
    return <article key={entry.id} className={`flex items-center gap-3 rounded-2xl p-3 ${card}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${income ? 'bg-[#6ee7b7]/15 text-[#6ee7b7]' : 'bg-[#fb8c8c]/15 text-[#fb8c8c]'}`}>{income ? <ArrowDownRight className="size-5" /> : <ArrowUpRight className="size-5" />}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{entry.title}</p><p className={`mt-0.5 text-xs ${muted}`}>{entry.category} · {new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium' }).format(new Date(entry.occurredAt))}</p></div>
      {entry.receiptPath && <a href={`/api/receipts?pathname=${encodeURIComponent(entry.receiptPath)}`} target="_blank" rel="noreferrer" aria-label={language === 'es' ? `Ver recibo de ${entry.title}` : `View receipt for ${entry.title}`} className="size-10 shrink-0 overflow-hidden rounded-xl"><img src={`/api/receipts?pathname=${encodeURIComponent(entry.receiptPath)}`} alt={language === 'es' ? `Recibo de ${entry.title}` : `Receipt for ${entry.title}`} className="size-full object-cover" /></a>}
      <p className={`shrink-0 text-sm font-bold ${income ? 'text-[#6ee7b7]' : ''}`}>{hidden ? '••••' : `${income ? '+' : '−'}${currency(entry.amount, language)}`}</p>
      <button type="button" onClick={() => onDelete(entry.id)} aria-label={language === 'es' ? `Eliminar ${entry.title}` : `Delete ${entry.title}`} className={`rounded-lg p-2 ${muted} hover:text-rose-400`}><Trash2 className="size-4" /></button>
    </article>
  })}</div>
}
