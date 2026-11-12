'use server'

import { del } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { budgets, expenseEntries, fixedExpenses, savingsGoals } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

function validTitle(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100
}

function validAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000
}

function validCategory(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 60
}

export async function addEntry(input: {
  title: string
  category: string
  type: 'expense' | 'income'
  amount: number
  receiptPath?: string
}) {
  const userId = await requireUserId()
  if (!validTitle(input.title) || !validCategory(input.category) || !validAmount(input.amount)) {
    return { ok: false as const, message: 'Revisa la descripción, categoría y monto.' }
  }
  if (input.type !== 'expense' && input.type !== 'income') {
    return { ok: false as const, message: 'Tipo de movimiento no válido.' }
  }
  if (input.receiptPath && (!input.receiptPath.startsWith(`receipts/${userId}/`) || input.receiptPath.length > 240)) {
    return { ok: false as const, message: 'El recibo no pertenece a esta cuenta.' }
  }

  await db.insert(expenseEntries).values({
    id: randomUUID(),
    userId,
    title: input.title.trim(),
    category: input.category.trim(),
    type: input.type,
    amount: Number(input.amount).toFixed(2),
    receiptPath: input.receiptPath,
  })
  revalidatePath('/')
  return { ok: true as const }
}

export async function removeEntry(id: string) {
  const userId = await requireUserId()
  if (typeof id !== 'string' || id.length > 80) return { ok: false as const }
  const [deletedEntry] = await db.delete(expenseEntries)
    .where(and(eq(expenseEntries.id, id), eq(expenseEntries.userId, userId)))
    .returning({ receiptPath: expenseEntries.receiptPath })
  if (deletedEntry?.receiptPath) {
    try {
      await del(deletedEntry.receiptPath)
    } catch (error) {
      console.error('[v0] Receipt cleanup failed:', error)
    }
  }
  revalidatePath('/')
  return { ok: true as const }
}

export async function addBudget(input: { category: string; monthlyLimit: number }) {
  const userId = await requireUserId()
  if (!validCategory(input.category) || !validAmount(input.monthlyLimit)) {
    return { ok: false as const, message: 'Revisa la categoría y el límite mensual.' }
  }
  await db.insert(budgets).values({
    id: randomUUID(),
    userId,
    category: input.category.trim(),
    monthlyLimit: Number(input.monthlyLimit).toFixed(2),
    month: new Date().toISOString().slice(0, 7),
  })
  revalidatePath('/')
  return { ok: true as const }
}

export async function addGoal(input: { title: string; targetAmount: number }) {
  const userId = await requireUserId()
  if (!validTitle(input.title) || !validAmount(input.targetAmount)) {
    return { ok: false as const, message: 'Revisa el nombre y el monto de tu meta.' }
  }
  await db.insert(savingsGoals).values({
    id: randomUUID(),
    userId,
    title: input.title.trim(),
    targetAmount: Number(input.targetAmount).toFixed(2),
    savedAmount: '0.00',
  })
  revalidatePath('/')
  return { ok: true as const }
}

export async function addGoalContribution(input: { goalId: string; amount: number }) {
  const userId = await requireUserId()
  if (typeof input.goalId !== 'string' || input.goalId.length > 80 || !validAmount(input.amount)) {
    return { ok: false as const, message: 'Revisa el monto de ahorro.' }
  }
  const [goal] = await db.update(savingsGoals)
    .set({ savedAmount: sql`${savingsGoals.savedAmount} + ${Number(input.amount).toFixed(2)}` })
    .where(and(eq(savingsGoals.id, input.goalId), eq(savingsGoals.userId, userId)))
    .returning({ id: savingsGoals.id })
  if (!goal) return { ok: false as const, message: 'No se encontró esa meta.' }
  revalidatePath('/')
  return { ok: true as const }
}

export async function addFixedExpense(input: { title: string; category: string; amount: number; dueDay: number }) {
  const userId = await requireUserId()
  if (!validTitle(input.title) || !validCategory(input.category) || !validAmount(input.amount) ||
      !Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return { ok: false as const, message: 'Revisa los datos del gasto fijo.' }
  }
  await db.insert(fixedExpenses).values({
    id: randomUUID(),
    userId,
    title: input.title.trim(),
    category: input.category.trim(),
    amount: Number(input.amount).toFixed(2),
    dueDay: input.dueDay,
  })
  revalidatePath('/')
  return { ok: true as const }
}

export async function getRecentEntries() {
  const userId = await requireUserId()
  return db.select().from(expenseEntries)
    .where(eq(expenseEntries.userId, userId))
    .orderBy(desc(expenseEntries.occurredAt))
    .limit(100)
}
