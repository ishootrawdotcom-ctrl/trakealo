'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Camera,
  ChevronRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  Globe2,
  House,
  Lightbulb,
  Menu,
  Mic,
  Moon,
  Plus,
  Receipt,
  Settings2,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  WalletCards,
  X,
} from 'lucide-react'

const copy = {
  es: {
    greeting: 'Buenos días, Eduardo',
    subtitle: 'Aquí tienes un resumen de tu dinero',
    balance: 'Balance disponible',
    income: 'Ingresos',
    expenses: 'Gastos',
    savings: 'Ahorro',
    thisMonth: 'Este mes',
    fixedAlert: 'Próximo gasto fijo',
    fixedDetail: 'Internet • vence en 2 días',
    fixedAction: 'Ver gastos fijos',
    insightTitle: 'Tu consejo inteligente',
    insight: 'Tus gastos en comida bajaron 18% esta semana. ¡Vas muy bien!',
    budgets: 'Presupuestos',
    goals: 'Metas de ahorro',
    recent: 'Actividad reciente',
    seeAll: 'Ver todo',
    add: 'Registrar gasto',
    voice: 'Voz',
    photo: 'Foto',
    manual: 'Manual',
    dashboard: 'Inicio',
    history: 'Historial',
    analytics: 'Análisis',
    settings: 'Ajustes',
    language: 'Idioma',
    theme: 'Tema',
    dark: 'Oscuro',
    light: 'Claro',
    close: 'Cerrar',
    categories: 'Categorías',
    spend: 'gastado',
    goal: 'para lograr',
  },
  en: {
    greeting: 'Good morning, Eduardo',
    subtitle: "Here's your money snapshot",
    balance: 'Available balance',
    income: 'Income',
    expenses: 'Expenses',
    savings: 'Savings',
    thisMonth: 'This month',
    fixedAlert: 'Next fixed expense',
    fixedDetail: 'Internet • due in 2 days',
    fixedAction: 'View fixed expenses',
    insightTitle: 'Your smart insight',
    insight: 'Your food spending is down 18% this week. Keep it up!',
    budgets: 'Budgets',
    goals: 'Savings goals',
    recent: 'Recent activity',
    seeAll: 'See all',
    add: 'Add expense',
    voice: 'Voice',
    photo: 'Photo',
    manual: 'Manual',
    dashboard: 'Home',
    history: 'History',
    analytics: 'Analytics',
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    close: 'Close',
    categories: 'Categories',
    spend: 'spent',
    goal: 'to go',
  },
} as const

const transactions = [
  { name: 'Supermercado', category: 'Comida', amount: '-$84.50', time: 'Hoy, 9:42 AM', icon: '🛒', tone: 'mint' },
  { name: 'Pago freelance', category: 'Ingresos', amount: '+$450.00', time: 'Ayer, 4:10 PM', icon: '↗', tone: 'violet' },
  { name: 'Netflix', category: 'Entretenimiento', amount: '-$15.99', time: 'Nov 08, 8:00 AM', icon: 'N', tone: 'rose' },
]

export default function Page() {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [dark, setDark] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [composer, setComposer] = useState(false)
  const [inputMode, setInputMode] = useState<'voice' | 'photo' | 'manual'>('voice')
  const t = copy[lang]
  const month = lang === 'es' ? 'Noviembre 2026' : 'November 2026'
  const number = (value: string) => (hidden ? '••••' : value)
  const nav = useMemo(() => [
    { label: t.dashboard, icon: House },
    { label: t.history, icon: Receipt },
    { label: t.analytics, icon: TrendingDown },
    { label: t.settings, icon: Settings2 },
  ], [t])

  return (
    <main className={dark ? 'min-h-screen bg-[#061a30] text-white' : 'min-h-screen bg-[#f5f7fa] text-[#12243a]'}>
      <div className="mx-auto min-h-screen max-w-[430px] overflow-hidden border-x border-white/5 bg-inherit shadow-2xl">
        <header className="flex items-center justify-between px-5 pb-3 pt-5">
          <button aria-label="Open menu" onClick={() => setDrawer(true)} className="rounded-xl p-2 text-white/70 transition hover:bg-white/10"><Menu /></button>
          <div className="flex items-center gap-2 text-lg font-black tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-[#fcb515] text-[#061a30]">T</span><span><b className="text-[#fcb515]">Tra</b>kealo</span></div>
          <div className="flex items-center gap-1">
            <button aria-label={t.language} onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="rounded-xl px-2 py-2 text-xs font-bold text-white/65 transition hover:bg-white/10"><Globe2 className="mr-1 inline size-4" />{lang.toUpperCase()}</button>
            <button aria-label={t.theme} onClick={() => setDark(!dark)} className="rounded-xl p-2 text-white/70 transition hover:bg-white/10">{dark ? <Sun className="size-5 text-[#fcb515]" /> : <Moon className="size-5" />}</button>
          </div>
        </header>

        <section className="px-5 pb-5 pt-3">
          <div className="mb-5 flex items-end justify-between"><div><p className="text-sm text-white/55">{t.greeting}</p><h1 className="mt-1 text-[28px] font-bold tracking-tight">{t.subtitle}</h1></div><button aria-label="Notifications" className="relative rounded-2xl bg-white/8 p-3 text-white/70"><Bell className="size-5" /><span className="absolute right-2 top-2 size-2 rounded-full bg-[#fcb515]" /></button></div>
          <div className="rounded-[28px] bg-gradient-to-br from-[#123c61] to-[#0c2946] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between"><span className="text-sm text-white/60">{t.balance}</span><button aria-label="Hide balance" onClick={() => setHidden(!hidden)} className="text-white/50">{hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div>
            <p className="mt-2 text-[34px] font-black tracking-tight">{number('$2,486.30')}</p><p className="mt-1 text-xs text-[#6ee7b7]">+12.8% <span className="text-white/45">vs. {lang === 'es' ? 'mes pasado' : 'last month'}</span></p>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4"><div><span className="text-xs text-white/50">{t.income}</span><p className="mt-1 font-semibold text-[#6ee7b7]">{number('$3,450.00')}</p></div><div><span className="text-xs text-white/50">{t.expenses}</span><p className="mt-1 font-semibold text-[#fb8c8c]">{number('$963.70')}</p></div><div><span className="text-xs text-white/50">{t.savings}</span><p className="mt-1 font-semibold">72%</p></div></div>
          </div>
        </section>

        <div className="flex items-center justify-between px-5 pb-3"><h2 className="font-bold">{month}</h2><button className="text-xs font-semibold text-[#fcb515]">{t.seeAll}</button></div>
        <section className="grid grid-cols-2 gap-3 px-5">
          <article className="rounded-3xl bg-[#0c2946] p-4"><div className="mb-4 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-2xl bg-[#fcb515]/15 text-[#fcb515]"><WalletCards className="size-5" /></span><span className="text-xs text-white/45">67%</span></div><p className="text-xs text-white/55">{t.budgets}</p><p className="mt-1 text-xl font-bold">$412 <span className="text-xs font-normal text-white/45">/ $610</span></p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-[67%] rounded-full bg-[#fcb515]" /></div></article>
          <article className="rounded-3xl bg-[#0c2946] p-4"><div className="mb-4 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-2xl bg-[#a78bfa]/15 text-[#a78bfa]"><Target className="size-5" /></span><span className="text-xs text-white/45">62%</span></div><p className="text-xs text-white/55">{t.goals}</p><p className="mt-1 text-xl font-bold">$1,250 <span className="text-xs font-normal text-white/45">/ $2,000</span></p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-[62%] rounded-full bg-[#a78bfa]" /></div></article>
        </section>

        <section className="mx-5 mt-4 rounded-3xl border border-[#fcb515]/25 bg-[#fcb515]/10 p-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#fcb515] text-[#061a30]"><Bell className="size-5" /></span><div className="flex-1"><p className="text-sm font-bold">{t.fixedAlert}</p><p className="mt-1 text-xs text-white/60">{t.fixedDetail}</p><button className="mt-3 text-xs font-bold text-[#fcb515]">{t.fixedAction} <ChevronRight className="ml-1 inline size-3" /></button></div></div></section>

        <section className="mx-5 mt-4 rounded-3xl bg-gradient-to-br from-[#3b2c55] to-[#1f294c] p-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#a78bfa]/20 text-[#c4b5fd]"><Sparkles className="size-5" /></span><div><p className="text-sm font-bold">{t.insightTitle}</p><p className="mt-1 text-sm leading-5 text-white/65">{t.insight}</p><button className="mt-3 text-xs font-bold text-[#c4b5fd]">{lang === 'es' ? 'Ver más consejos' : 'See more insights'} <ChevronRight className="ml-1 inline size-3" /></button></div></div></section>

        <section className="px-5 pb-28 pt-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{t.recent}</h2><button className="text-xs font-semibold text-[#fcb515]">{t.seeAll}</button></div><div className="flex flex-col gap-2">{transactions.map((item) => <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><span className={`grid size-10 place-items-center rounded-2xl text-sm font-bold ${item.tone === 'mint' ? 'bg-[#6ee7b7]/15 text-[#6ee7b7]' : item.tone === 'violet' ? 'bg-[#a78bfa]/15 text-[#c4b5fd]' : 'bg-[#fb8c8c]/15 text-[#fb8c8c]'}`}>{item.icon}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-0.5 text-xs text-white/45">{item.category} • {item.time}</p></div><p className={`text-sm font-bold ${item.amount.startsWith('+') ? 'text-[#6ee7b7]' : ''}`}>{number(item.amount)}</p></div>)}</div></section>

        <button onClick={() => setComposer(true)} className="fixed bottom-24 right-5 z-20 grid size-14 place-items-center rounded-2xl bg-[#fcb515] text-[#061a30] shadow-lg shadow-[#fcb515]/25 transition hover:scale-105" aria-label={t.add}><Plus className="size-7" /></button>
        <nav className="fixed bottom-0 left-1/2 z-10 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-white/8 bg-[#061a30]/95 px-2 py-3 backdrop-blur-xl">{nav.map((item, index) => { const Icon = item.icon; return <button key={item.label} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1 text-[10px] font-semibold ${index === 0 ? 'text-[#fcb515]' : 'text-white/40'}`}><Icon className="size-5" /><span>{item.label}</span></button> })}<button onClick={() => setComposer(true)} className="-mt-7 grid size-14 place-items-center rounded-full border-4 border-[#061a30] bg-[#fcb515] text-[#061a30] shadow-lg"><Plus className="size-6" /></button></nav>

        {drawer && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setDrawer(false)}><aside onClick={(e) => e.stopPropagation()} className="h-full w-[82%] max-w-[350px] bg-[#09213a] p-6 shadow-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-[#fcb515] text-lg font-black text-[#061a30]">ED</div><div><p className="text-xs text-white/45">Hola,</p><p className="font-bold">Eduardo</p></div></div><button aria-label={t.close} onClick={() => setDrawer(false)}><X className="text-white/60" /></button></div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-white/45">{t.savings}</p><p className="mt-1 font-bold text-[#6ee7b7]">72%</p></div><div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-white/45">{t.expenses}</p><p className="mt-1 font-bold text-[#fb8c8c]">28%</p></div></div><div className="mt-8 flex flex-col gap-2"><button className="flex items-center gap-3 rounded-2xl bg-[#fcb515] px-4 py-3 text-left text-sm font-bold text-[#061a30]"><House className="size-5" />{t.dashboard}</button>{[t.budgets, t.goals, t.categories, t.history].map((label) => <button key={label} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/5"><CircleDollarSign className="size-5 text-white/40" />{label}</button>)}</div><div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/50"><p className="mb-3 text-xs uppercase tracking-widest">{t.theme}</p><button onClick={() => setDark(!dark)} className="flex w-full items-center justify-between rounded-2xl bg-white/5 p-3"><span className="flex items-center gap-3">{dark ? <Moon className="size-5" /> : <Sun className="size-5" />}{dark ? t.dark : t.light}</span><span className="text-[#fcb515]">{dark ? '●' : '○'}</span></button></div></aside></div>}

        {composer && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3" onClick={() => setComposer(false)}><section onClick={(e) => e.stopPropagation()} className="w-full max-w-[410px] rounded-[30px] bg-[#0c2946] p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-bold">{t.add}</p><p className="text-xs text-white/45">{lang === 'es' ? 'Elige cómo quieres registrarlo' : 'Choose how you want to add it'}</p></div><button aria-label={t.close} onClick={() => setComposer(false)} className="rounded-xl bg-white/5 p-2"><X className="size-5" /></button></div><div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-1">{([['voice', Mic, t.voice], ['photo', Camera, t.photo], ['manual', Receipt, t.manual]] as const).map(([mode, Icon, label]) => <button key={mode} onClick={() => setInputMode(mode)} className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold ${inputMode === mode ? 'bg-[#fcb515] text-[#061a30]' : 'text-white/55'}`}><Icon className="size-5" />{label}</button>)}</div>{inputMode === 'voice' ? <div className="py-8 text-center"><div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-[#fcb515]/15 text-[#fcb515]"><Mic className="size-8" /></div><p className="font-semibold">{lang === 'es' ? 'Toca para hablar' : 'Tap to speak'}</p><p className="mt-2 text-xs text-white/45">{lang === 'es' ? '“Gasté 18 dólares en almuerzo”' : '“I spent 18 dollars on lunch”'}</p></div> : inputMode === 'photo' ? <div className="py-8 text-center"><div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-[#fcb515]/15 text-[#fcb515]"><Camera className="size-8" /></div><p className="font-semibold">{lang === 'es' ? 'Escanea tu recibo' : 'Scan your receipt'}</p><p className="mt-2 text-xs text-white/45">{lang === 'es' ? 'La IA detectará monto y categoría' : 'AI will detect amount and category'}</p></div> : <div className="flex flex-col gap-3 py-6"><input placeholder={lang === 'es' ? '¿En qué gastaste?' : 'What did you spend on?'} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35" /><input placeholder={lang === 'es' ? 'Monto' : 'Amount'} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35" /></div>}<button onClick={() => setComposer(false)} className="w-full rounded-2xl bg-[#fcb515] py-3.5 font-bold text-[#061a30]">{lang === 'es' ? 'Continuar' : 'Continue'}</button></section></div>}
      </div>
    </main>
  )
}
