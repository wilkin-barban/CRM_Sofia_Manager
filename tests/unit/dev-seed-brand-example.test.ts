import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const seed = readFileSync(join(process.cwd(), 'supabase/seed.sql'), 'utf8')
const executableSql = seed.replace(/--[^\n]*/g, '').trim()

describe('clean development seed', () => {
  it('restores demo auth and roles without modifying existing users or profiles', () => {
    expect(executableSql).toMatch(/insert\s+into\s+auth\.users/i)
    for (const id of ['a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '7c7c7c7c-7c7c-7c7c-7c7c-7c7c7c7c7c7c', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'd5d5d5d5-d5d5-d5d5-d5d5-d5d5d5d5d5d5']) {
      expect(executableSql).toContain(id)
    }
    for (const role of ['admin', 'vendedor', 'supervisor']) expect(executableSql).toContain(`'${role}'`)
    expect(executableSql).toMatch(/on\s+conflict\s+do\s+nothing\s+returning\s+id\s+into\s+\w+/i)
    expect(executableSql).toMatch(/if\s+\w+\s+is\s+not\s+null\s+then[\s\S]*update\s+public\.perfis[\s\S]*where\s+id\s*=\s*\w+/i)
    expect(executableSql).not.toMatch(/\b(delete|truncate)\b/i)
    expect(executableSql).not.toMatch(/(?:insert\s+into|update)\s+public\.(?:clientes|conversas|mensagens|produtos|base_conhecimento|documentos_conhecimento)\b/i)
  })
})
