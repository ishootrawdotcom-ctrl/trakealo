import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Dashboard } from '@/components/dashboard'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { budgets, expenseEntries, fixedExpenses, savingsGoals } from '@/lib/db/schema'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const now = new Date()
  const year = now.getUTCFullYear()
  const monthIndex = now.getUTCMonth()
  const month = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const monthStart = new Date(Date.UTC(year, monthIndex, 1))
  const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1))
  const previousMonthStart = new Date(Date.UTC(year, monthIndex - 1, 1))
  const daysInPreviousMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate()
  const previousPeriodEnd = new Date(Date.UTC(year, monthIndex - 1, Math.min(now.getUTCDate(), daysInPreviousMonth) + 1))

  const [entries, userBudgets, goals, recurring, totals, topCategories] = await Promise.all([
    db.select().from(expenseEntries)
      .where(eq(expenseEntries.userId, session.user.id))
      .orderBy(desc(expenseEntries.occurredAt))
      .limit(100),
    db.select().from(budgets)
      .where(and(eq(budgets.userId, session.user.id), eq(budgets.month, month))),
    db.select().from(savingsGoals).where(eq(savingsGoals.userId, session.user.id)),
    db.select().from(fixedExpenses)
      .where(and(eq(fixedExpenses.userId, session.user.id), eq(fixedExpenses.active, true))),
    db.select({
      balance: sql<string>`COALESCE(SUM(CASE WHEN ${expenseEntries.type} = 'income' THEN ${expenseEntries.amount} ELSE -${expenseEntries.amount} END), 0)`,
      monthlyIncome: sql<string>`COALESCE(SUM(CASE WHEN ${expenseEntries.type} = 'income' AND ${expenseEntries.occurredAt} >= ${monthStart} AND ${expenseEntries.occurredAt} < ${nextMonthStart} THEN ${expenseEntries.amount} ELSE 0 END), 0)`,
      monthlyExpenses: sql<string>`COALESCE(SUM(CASE WHEN ${expenseEntries.type} = 'expense' AND ${expenseEntries.occurredAt} >= ${monthStart} AND ${expenseEntries.occurredAt} < ${nextMonthStart} THEN ${expenseEntries.amount} ELSE 0 END), 0)`,
      previousPeriodExpenses: sql<string>`COALESCE(SUM(CASE WHEN ${expenseEntries.type} = 'expense' AND ${expenseEntries.occurredAt} >= ${previousMonthStart} AND ${expenseEntries.occurredAt} < ${previousPeriodEnd} THEN ${expenseEntries.amount} ELSE 0 END), 0)`,
    }).from(expenseEntries).where(eq(expenseEntries.userId, session.user.id)),
    db.select({
      category: expenseEntries.category,
      amount: sql<string>`SUM(${expenseEntries.amount})`,
    }).from(expenseEntries)
      .where(and(
        eq(expenseEntries.userId, session.user.id),
        eq(expenseEntries.type, 'expense'),
        sql`${expenseEntries.occurredAt} >= ${monthStart}`,
        sql`${expenseEntries.occurredAt} < ${nextMonthStart}`,
      ))
      .groupBy(expenseEntries.category)
      .orderBy(desc(sql`SUM(${expenseEntries.amount})`)),
  ])

  return (
    <Dashboard
      user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
      initialData={{
        entries,
        budgets: userBudgets,
        goals,
        fixedExpenses: recurring,
        summary: {
          balance: Number(totals[0]?.balance ?? 0),
          monthlyIncome: Number(totals[0]?.monthlyIncome ?? 0),
          monthlyExpenses: Number(totals[0]?.monthlyExpenses ?? 0),
          previousPeriodExpenses: Number(totals[0]?.previousPeriodExpenses ?? 0),
          categorySpending: topCategories.map((row) => ({ category: row.category, amount: Number(row.amount) })),
        },
      }}
    />
  )
}
