// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ mockAllowed: true, key: '', chat: vi.fn(), hours: [] as unknown[] }))
vi.mock('@/lib/runtime/environment', () => ({ allowsIntegrationMock: () => h.mockAllowed }))
vi.mock('@/lib/config/sistema', () => ({ obterConfiguracaoSistema: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/config/business-profile', () => ({
  getBusinessProfile: vi.fn().mockResolvedValue({ name: 'Loja', personaRole: 'assistente', location: 'Curitiba' }),
  resolveBusinessProfileSync: vi.fn().mockReturnValue({ name: 'Loja', personaRole: 'assistente', location: 'Curitiba' }),
}))
vi.mock('@/lib/sofia/default-prompt', () => ({ buildDefaultSofiaSystemPrompt: () => 'assistente' }))
vi.mock('@/lib/whatsapp/send', () => ({ enviarMensagemWhatsapp: vi.fn() }))
vi.mock('@/lib/telegram/send', () => ({ enviarMensagemTelegram: vi.fn() }))
vi.mock('@/lib/ai/deepseek', () => ({
  chamarDeepSeekChat: h.chat,
  isUsableDeepSeekApiKey: (key: string) => Boolean(key),
  resolverChaveDeepSeek: async () => h.key,
  resolverModeloDeepSeek: async () => 'test-model',
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: (table: string) => {
      const query: any = {}
      for (const method of ['select', 'eq', 'order', 'limit', 'in']) query[method] = () => query
      query.then = (resolve: (value: unknown) => void) => Promise.resolve({ data: table === 'horarios_atendimento' ? h.hours : [], error: null }).then(resolve)
      query.single = async () => ({ data: { id: 'c', cliente_id: 'u', ia_ativa: true, clientes: {} }, error: null })
      query.maybeSingle = async () => ({ data: null, error: null })
      return query
    },
  }),
}))

import { processarRagPipeline } from '@/lib/ai/openrouter'

beforeEach(() => {
  h.mockAllowed = true
  h.key = ''
  h.hours = []
  h.chat.mockReset()
})

describe('Sofia neutral contingency', () => {
  it.each(['cardápio', 'combo 1', 'costela', 'combo 3', 'kit churrasco', 'preço', 'pedido', 'horário', 'endereço', 'cancelar pedido', 'Olá'])('does not invent catalog or operational details for %s', async (message) => {
    const result = await processarRagPipeline('c', message, 'web', true)
    expect(result.sucesso).toBe(true)
    if (!('respostaIa' in result)) throw new Error('missing response')
    expect(result.respostaIa).toMatch(/atualizaç|atendente|atendimento humano/i)
    expect(result.respostaIa).not.toMatch(/costela|frango|churrasco|combo|R\$|\d{1,2}h|estacionamento/i)
    expect(h.chat).not.toHaveBeenCalled()
  })

  it.each([{ success: false, error: 'offline' }, { success: true, content: '' }])('uses neutral fallback when provider returns %j', async (providerResult) => {
    h.key = 'sk-test'
    h.chat.mockResolvedValue(providerResult)
    const result = await processarRagPipeline('c', 'preço', 'web', true)
    expect(result.sucesso).toBe(true)
    if (!('respostaIa' in result)) throw new Error('missing response')
    expect(result.respostaIa).toMatch(/atualizaç|atendente|atendimento humano/i)
    expect(result.respostaIa).not.toMatch(/costela|frango|churrasco|combo|R\$/i)
  })

  it('keeps provider failure fail-closed when mocks are forbidden', async () => {
    h.mockAllowed = false
    h.key = 'sk-test'
    h.chat.mockResolvedValue({ success: false, error: 'offline' })
    expect(await processarRagPipeline('c', 'cardápio', 'web', true)).toEqual({ sucesso: false, error: 'IA_INDISPONIVEL' })
  })

  it('uses a neutral RAG heading for real business hours', async () => {
    h.key = 'sk-test'
    h.hours = [{ dia_semana: 1, hora_abertura: '09:00:00', hora_fechamento: '17:00:00' }]
    h.chat.mockResolvedValue({ success: true, content: 'Olá!' })
    await processarRagPipeline('c', 'Olá', 'web', true)
    const prompt = h.chat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('HORÁRIOS DE ATENDIMENTO:')
    expect(prompt).not.toContain('CHURRASCARIA')
    expect(prompt).toContain('Segunda-feira: das 09:00 às 17:00')
  })
})
