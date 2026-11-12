import { del, get, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isTrustedRequestOrigin } from '@/lib/origins'

const maxFileSize = 8 * 1024 * 1024
const supportedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

async function getUserId(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user.id
}

function isAllowedReceiptPath(pathname: string, userId: string) {
  return pathname.startsWith(`receipts/${userId}/`) && pathname.length <= 240
}

export async function POST(request: NextRequest) {
  if (!isTrustedRequestOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a receipt photo.' }, { status: 400 })

  const extension = supportedTypes.get(file.type)
  if (!extension || file.size === 0 || file.size > maxFileSize) {
    return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image up to 8 MB.' }, { status: 400 })
  }

  try {
    const pathname = `receipts/${userId}/${randomUUID()}.${extension}`
    const blob = await put(pathname, file, {
      access: 'private',
      addRandomSuffix: false,
      contentType: file.type,
    })
    return NextResponse.json({ pathname: blob.pathname }, { status: 201 })
  } catch (error) {
    console.error('[v0] Receipt upload failed:', error)
    return NextResponse.json({ error: 'Receipt upload failed.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname || !isAllowedReceiptPath(pathname, userId)) {
    return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })
    if (!result) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' },
      })
    }
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'X-Content-Type-Options': 'nosniff',
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[v0] Receipt read failed:', error)
    return NextResponse.json({ error: 'Receipt could not be loaded.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isTrustedRequestOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const body = await request.json().catch(() => null) as { pathname?: string } | null
  if (!body?.pathname || !isAllowedReceiptPath(body.pathname, userId)) {
    return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
  }

  try {
    await del(body.pathname)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] Receipt delete failed:', error)
    return NextResponse.json({ error: 'Receipt could not be deleted.' }, { status: 500 })
  }
}
