import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(process.cwd(), 'supabase/migrations/20261121010000_clear_legacy_barbecue_catalog.sql')
const legacyPath = join(process.cwd(), 'supabase/migrations/20260816260000_seed_combos_e_base_conhecimento_oficial.sql')
const sql = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8').replace(/--[^\n]*/g, '') : ''
const legacy = readFileSync(legacyPath, 'utf8')
const productIds = [...new Set([...legacy.matchAll(/'[a-d][1-4]{7}-[1-4]{4}-4[1-4]{3}-8[1-4]{3}-[1-4]{12}'/gi)].map((match) => match[0]))]

describe('forward cleanup of the legacy catalog (static checks only)', () => {
  it('provides a forward migration', () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  it('includes all thirteen historical product identifiers', () => {
    expect(productIds).toHaveLength(13)
    for (const id of productIds) expect(sql.toLowerCase()).toContain(id.toLowerCase())
  })

  it('does not truncate or delete authentication and profile data', () => {
    expect(sql).not.toMatch(/\btruncate\b/i)
    expect(sql).not.toMatch(/\bdelete\s+from\s+(?:auth\.users|public\.perfis)\b/i)
  })

  it('checks all known incoming product references, including cascading stock movements', () => {
    for (const table of ['itens_pedido', 'itens_carrinho', 'pedido_estoque_efeitos', 'movimentacoes_estoque']) {
      expect(sql.toLowerCase()).toContain(table)
    }
  })

  it('limits knowledge deletion to the five exact legacy titles', () => {
    const statement = sql.match(/DELETE FROM public\.base_conhecimento\s+WHERE[\s\S]*?;/i)?.[0] ?? ''
    expect(statement).not.toMatch(/\bilike\b/i)
    const values = [...statement.matchAll(/'([^']+)'/g)].map((match) => match[1])
    expect(values).toEqual([
      'Combo 1 – O Clássico da Casa: Ficha Técnica e Detalhes',
      'Combo 2 – Costela Suprema no Bafo: Ficha Técnica e Preparo',
      'Combo 3 – Dueto Especial (Frango & Costelinha Suína): Ficha Técnica',
      'Combo 4 – Kit Churrasco Família: O Grande Banquete',
      'Janelas de Retirada (Takeaway) e Delivery Próprio',
    ])
    expect(statement).toMatch(/WHERE\s+titulo\s+IN\s*\(/i)
  })

  it('limits message deletion to the two demo message IDs', () => {
    const statement = sql.match(/DELETE FROM public\.mensagens\s+WHERE[\s\S]*?;/i)?.[0] ?? ''
    expect(statement).toMatch(/WHERE\s+id\s+IN\s*\(/i)
    expect([...statement.matchAll(/'([^']+)'/g)].map((match) => match[1])).toEqual([
      'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6',
      'f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7',
    ])
  })

  it('includes locking and explicit failure handling', () => {
    expect(sql).toMatch(/\block\s+table\b/i)
    expect(sql).toMatch(/\braise\s+exception\b/i)
  })
})
