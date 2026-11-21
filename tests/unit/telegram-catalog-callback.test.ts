import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  admin: vi.fn(),
  config: vi.fn(),
  global: vi.fn(),
  tools: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: m.admin }))
vi.mock('@/lib/config/sistema', () => ({
  obterConfiguracaoSistema: m.config,
  obterSofiaGlobalChannelConfig: m.global,
}))
vi.mock('@/lib/ai/tools', () => ({ executarToolSofia: m.tools }))
vi.mock('@/lib/ai/openrouter', () => ({ processarRagPipeline: vi.fn() }))
vi.mock('@/lib/sofia/inbound-batch-producer', () => ({ attachPersistedSofiaInboundMessage: vi.fn() }))
vi.mock('@/lib/horarios/verificar', () => ({ verificarHorarioAtendimento: vi.fn() }))
vi.mock('@/lib/whatsapp/contact-status', () => ({
  classificarIntencaoMensagem: vi.fn(),
  processarStatusContatoInbound: vi.fn(),
}))

import { POST } from '@/app/api/webhooks/telegram/route'

const CHAT_ID = 1001
const OFFICIAL_IDS = ['doce-1', 'geladinho-2']

type ProductOverrides = { url_imagem?: string | null }

function product(id: string, overrides: ProductOverrides = {}) {
  return {
    id,
    nome: `Produto ${id}`,
    descricao: 'Doce artesanal',
    preco_centavos: 11990,
    quantidade_estoque: 5,
    url_imagem: null,
    ...overrides,
  }
}

type CallbackDbOptions = {
  linked?: boolean
  products?: ReturnType<typeof product>[] | null
  productsError?: boolean
}

function db({ linked = true, products = null, productsError = false }: CallbackDbOptions = {}) {
  const reads: string[] = []
  const client: any = {
    from: vi.fn((table: string) => {
      const builder: any = {
        select: vi.fn(() => {
          reads.push(table)
          return builder
        }),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        order: vi.fn(async () => ({
          data: productsError ? null : products,
          error: productsError ? { message: 'boom' } : null,
        })),
        update: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        maybeSingle: vi.fn(async () =>
          table === 'clientes'
            ? {
                data: linked ? { id: 'client-1', telefone: '5541999990003' } : null,
                error: null,
              }
            : { data: null, error: null }
        ),
        single: vi.fn(async () => ({ data: { id: 'message-1', ia_ativa: true }, error: null })),
      }
      return builder
    }),
  }
  return { client, reads }
}

function callbackRequest(data: string) {
  return new Request('https://test/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'x-telegram-bot-api-secret-token': 'webhook-secret' },
    body: JSON.stringify({
      callback_query: {
        id: 'callback-1',
        from: { id: CHAT_ID },
        data,
        message: {
          message_id: 55,
          chat: { id: CHAT_ID, first_name: 'Ana' },
          from: { id: CHAT_ID },
        },
      },
    }),
  })
}

function telegramFetch({ rejectPhoto = false }: { rejectPhoto?: boolean } = {}) {
  return vi.fn<(url: string | URL, init: any) => Promise<any>>(async (...args: [string | URL, any]) => {
    if (rejectPhoto && args[0].toString().includes('/sendPhoto')) {
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ description: 'wrong file identifier' }),
      }
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    }
  })
}

function outbound(fetchMock: ReturnType<typeof telegramFetch>) {
  return fetchMock.mock.calls.map((call) => ({
    method: call[0].toString().split('/').pop(),
    body: call[1]?.body ? JSON.parse(call[1].body) : null,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  m.config.mockImplementation(async (key: string) =>
    key === 'TELEGRAM_BOT_TOKEN' ? 'bot-token' : 'webhook-secret'
  )
  m.global.mockResolvedValue({ enabled: true })
  m.tools.mockResolvedValue({ success: true, mensagem: 'Pedido atualizado.' })
})

describe('Telegram catalog callback opt-in', () => {
  it('acks and sends all active cards in query order only for an explicit linked view click', async () => {
    const { client, reads } = db({
      products: OFFICIAL_IDS.map((id) => product(id)),
    })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(callbackRequest('catalog:view'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'catalog_view_sent' })
    expect(reads).toContain('produtos')

    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery', 'sendMessage', 'sendMessage'])
    expect(sent[0].body).toMatchObject({
      callback_query_id: 'callback-1',
      show_alert: false,
      text: 'Consultando o cardápio...',
    })

    expect(sent[1].body.chat_id).toBe('1001')
    expect(sent[1].body.reply_markup.inline_keyboard).toEqual([
      [
        { text: '🛒 Adicionar', callback_data: `catalog:add:${OFFICIAL_IDS[0]}` },
        { text: '👀 Detalhes', callback_data: `catalog:details:${OFFICIAL_IDS[0]}` },
      ],
      [{ text: '🧺 Ver carrinho', callback_data: 'catalog:cart' }],
    ])
    expect(sent[2].body.reply_markup.inline_keyboard[0][0].callback_data).toBe(
      `catalog:add:${OFFICIAL_IDS[1]}`
    )
    expect(sent[1].body.text).toContain('Produto doce-1')
    expect(sent[2].body.text).toContain('Produto geladinho-2')
  })

  it('keeps the phone link requirement and sends no card for an unlinked view click', async () => {
    const { client, reads } = db({ linked: false, products: OFFICIAL_IDS.map((id) => product(id)) })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(callbackRequest('catalog:view'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'client_required' })
    expect(reads).not.toContain('produtos')

    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery'])
    expect(sent[0].body.text).toContain('Compartilhe seu telefone')
  })

  it('sends no card and no catalog query for an unknown callback', async () => {
    const { client, reads } = db({ products: OFFICIAL_IDS.map((id) => product(id)) })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(callbackRequest('catalog:delete:product-1'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'unsupported_callback' })
    expect(reads).toEqual([])

    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery'])
    expect(sent[0].body.text).toBe('Ação indisponível.')
  })

  it('reports the unavailable state and never claims a send when the catalog query fails', async () => {
    const { client } = db({ productsError: true })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(callbackRequest('catalog:view'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'catalog_view_unavailable' })
    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery', 'sendMessage'])
    expect(sent[0].body.text).toBe('Consultando o cardápio...')
    expect(sent[1].body.chat_id).toBe('1001')
    expect(sent[1].body.text).toContain('Tente novamente')
    expect(sent.some((entry) => entry.method === 'sendPhoto')).toBe(false)
    expect(JSON.stringify(sent)).not.toContain('Enviando o catálogo')
  })

  it('answers the click with retry feedback instead of a silent no-op for an empty catalog', async () => {
    const { client } = db({ products: [] })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(callbackRequest('catalog:view'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'catalog_view_empty' })
    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery', 'sendMessage'])
    expect(sent[0].body.text).toBe('Consultando o cardápio...')
    expect(sent[1].body.text).toContain('Tente novamente')
    expect(sent.some((entry) => entry.method === 'sendPhoto')).toBe(false)
    expect(JSON.stringify(sent)).not.toContain('Enviando o catálogo')
  })

  it('sends a single arbitrary product instead of reporting empty', async () => {
    const { client } = db({ products: [product('produto-arbitrario')] })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(callbackRequest('catalog:view'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'catalog_view_sent' })
    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery', 'sendMessage'])
    expect(sent.some((entry) => entry.method === 'sendPhoto')).toBe(false)
    expect(sent[1].body.text).toContain('Produto produto-arbitrario')
    expect(sent[1].body.reply_markup.inline_keyboard[0][0].callback_data).toBe('catalog:add:produto-arbitrario')
    expect(JSON.stringify(sent)).not.toContain('Enviando o catálogo')
  })

  it('falls back to a text card when Telegram rejects the catalog photo', async () => {
    const { client } = db({
      products: [product(OFFICIAL_IDS[0], { url_imagem: 'https://asados.test/combo-1.jpg' })],
    })
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch({ rejectPhoto: true })
    vi.stubGlobal('fetch', fetchMock)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const response = await POST(callbackRequest('catalog:view'))

    expect(await response.json()).toMatchObject({ ok: true, status: 'catalog_view_sent' })
    const sent = outbound(fetchMock)
    expect(sent.map((entry) => entry.method)).toEqual(['answerCallbackQuery', 'sendPhoto', 'sendMessage'])
    expect(sent[2].body.text).toContain('R$ 119,90')
    expect(sent[2].body.reply_markup.inline_keyboard).toContainEqual([
      { text: '🧺 Ver carrinho', callback_data: 'catalog:cart' },
    ])

    warn.mockRestore()
  })

  it('keeps cart and add callbacks on their existing tool paths without sending cards', async () => {
    const { client } = db()
    m.admin.mockReturnValue(client)
    const fetchMock = telegramFetch()
    vi.stubGlobal('fetch', fetchMock)

    const cartResponse = await POST(callbackRequest('catalog:cart'))
    expect(await cartResponse.json()).toMatchObject({ ok: true, status: 'catalog_cart' })
    expect(m.tools).toHaveBeenCalledWith(
      'ver_carrinho',
      {},
      expect.objectContaining({ clienteId: 'client-1', canal: 'telegram' })
    )

    const addResponse = await POST(callbackRequest(`catalog:add:${OFFICIAL_IDS[0]}`))
    expect(await addResponse.json()).toMatchObject({ ok: true, status: 'catalog_add' })
    expect(m.tools).toHaveBeenCalledWith(
      'adicionar_ao_carrinho',
      { produtoId: OFFICIAL_IDS[0], quantidade: 1 },
      expect.objectContaining({ clienteId: 'client-1', canal: 'telegram' })
    )

    const sent = outbound(fetchMock)
    expect(sent.some((entry) => entry.method === 'sendPhoto')).toBe(false)
    expect(sent.every((entry) => entry.method === 'answerCallbackQuery' || entry.method === 'sendMessage')).toBe(
      true
    )
  })
})
