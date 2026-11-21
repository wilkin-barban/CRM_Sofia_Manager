import { describe, it, expect } from 'vitest'
import { COMBOS_OFICIAIS, obterCartoesCombosOficiais, obterCartaoCombo, gerarCatalogoTextoCompleto, gerarCatalogoCardsCompleto } from '@/lib/cardapio/cards'

describe('Cartões de catálogo', () => {
  it('não oferece cartões estáticos antigos', () => {
    expect(COMBOS_OFICIAIS).toEqual([])
    expect(obterCartoesCombosOficiais()).toEqual([])
    expect(obterCartaoCombo(1)).toBeUndefined()
    expect(obterCartaoCombo('Combo 2')).toBeUndefined()
  })

  it('informa catálogo vazio sem promessas ou imagens antigas', () => {
    const texto = gerarCatalogoTextoCompleto()
    expect(texto).toMatch(/cardápio.*atualiz/i)
    expect(texto).not.toMatch(/churrasco|assado|costela|frango|\/cardapio\//i)
    expect(gerarCatalogoCardsCompleto()).toBe(texto)
  })
})
