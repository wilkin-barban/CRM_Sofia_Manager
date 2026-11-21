import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ admin: vi.fn(), config: vi.fn(), send: vi.fn(), feedback: vi.fn(), ack: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: m.admin }))
vi.mock('@/lib/config/sistema', () => ({ obterConfiguracaoSistema: m.config, obterSofiaGlobalChannelConfig: vi.fn() }))
vi.mock('@/lib/ai/openrouter', () => ({ processarRagPipeline: vi.fn() }))
vi.mock('@/lib/telegram/send', () => ({ enviarCatalogoTelegram: m.send, enviarFeedbackCatalogoTelegram: m.feedback, responderCallbackTelegram: m.ack, enviarOrientacaoComprovanteTelegram: vi.fn(), enviarPromptCatalogoTelegram: vi.fn() }))
import { POST } from '@/app/api/webhooks/telegram/route'

const products = [{ id: 'doce-aleatorio', nome: 'Geladinho', descricao: null, preco_centavos: 500, quantidade_estoque: 1, url_imagem: null }]
function setup(data: typeof products, linked = true) {
  const eq = vi.fn(() => builder)
  const builder: any = { select: vi.fn(() => builder), eq, order: vi.fn(async () => ({ data, error: null })), maybeSingle: vi.fn(async () => ({ data: linked ? { id: 'cliente', telefone: '123' } : null, error: null })) }
  m.admin.mockReturnValue({ from: vi.fn(() => builder) })
  return eq
}
function request() {
  return new Request('https://example.test', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'secret' }, body: JSON.stringify({ callback_query: { id: 'cb', from: { id: 10 }, data: 'catalog:view', message: { chat: { id: 10 } } } }) })
}
beforeEach(() => { vi.clearAllMocks(); m.config.mockResolvedValue('secret') })
describe('catálogo Telegram com produtos cadastrados', () => {
  it('envia produto arbitrário ativo ao cliente vinculado', async () => {
    const eq = setup(products)
    expect(await (await POST(request())).json()).toMatchObject({ status: 'catalog_view_sent' })
    expect(eq).toHaveBeenCalledWith('ativo', true)
    expect(m.send).toHaveBeenCalledWith('10', products)
  })
  it('informa catálogo vazio sem enviar cartões', async () => {
    setup([])
    expect(await (await POST(request())).json()).toMatchObject({ status: 'catalog_view_empty' })
    expect(m.feedback).toHaveBeenCalledWith('10', 'empty')
    expect(m.send).not.toHaveBeenCalled()
  })
  it('rejeita segredo incorreto antes de consultar produtos', async () => {
    setup(products)
    m.config.mockResolvedValue('outro-segredo')
    expect((await POST(request())).status).toBe(401)
    expect(m.admin).not.toHaveBeenCalled()
    expect(m.send).not.toHaveBeenCalled()
  })
  it('não envia catálogo para cliente não vinculado', async () => {
    setup(products, false)
    expect(await (await POST(request())).json()).toMatchObject({ status: 'client_required' })
    expect(m.send).not.toHaveBeenCalled()
  })
})
