import { describe, expect, it } from 'vitest'
import { formatarCardapioResumido, calcularRecomendacaoCardapio, type ProdutoCardapio } from '@/lib/cardapio/formatar'

describe('Cardápio geral', () => {
  const produtos: ProdutoCardapio[] = [
    { id: 'doce', nome: 'Brigadeiro', descricao: 'Chocolate artesanal', preco_centavos: 500, quantidade_estoque: 3 },
    { id: 'combo', nome: 'Combo 2 geladinhos', descricao: 'Serve duas pessoas', preco_centavos: 1200 },
    { id: 'bebida', nome: 'Suco', preco_centavos: 700, url_imagem: '/fotos/suco.png' },
    { id: 'outro', nome: 'Geladinho', preco_centavos: 600, url_imagem: 'https://example.com/foto.png' },
  ]

  it('preserva prioridades e texto das recomendações anteriores', () => {
    const legado: ProdutoCardapio[] = [
      { id: 'barato', nome: 'Farofa', preco_centavos: 500 },
      { id: 'kit', nome: 'Kit Família', preco_centavos: 5000 },
      { id: 'costela', nome: 'Costela', preco_centavos: 3000 },
      { id: 'picanha', nome: 'Picanha', preco_centavos: 2000 },
    ]
    for (const [pessoas, orcamento, esperado] of [
      [4, undefined, 'kit'], [3, undefined, 'costela'],
      [4, 3000, 'costela'], [4, 2000, 'picanha'], [4, 100, 'barato'],
      [4, 0, 'kit'],
    ] as const) {
      const rec = calcularRecomendacaoCardapio({ pessoas, orcamentoMaximoCentavos: orcamento, produtos: legado })
      const produto = legado.find((p) => p.id === esperado)!
      expect(rec.itens).toEqual([{ produto, quantidade: 1, subtotalCentavos: produto.preco_centavos }])
      expect(rec.textoExplicativo).toBe(`Para ${pessoas} pessoas, a melhor opção recomendada é 1x ${produto.nome}, ficando em ${rec.totalFormatado}.`)
    }
  })

  it('preserva a primeira opção histórica mesmo sem estoque informado como disponível', () => {
    const produtos: ProdutoCardapio[] = [
      { id: 'primeira', nome: 'Costela', preco_centavos: 3000, quantidade_estoque: 0 },
      { id: 'segunda', nome: 'Costela especial', preco_centavos: 2000 },
    ]
    expect(calcularRecomendacaoCardapio({ pessoas: 2, produtos }).itens[0].produto.id).toBe('primeira')
  })

  it('não recomenda produtos genéricos sem estoque', () => {
    const produtos: ProdutoCardapio[] = [
      { id: 'esgotado', nome: 'Doce', preco_centavos: 100, quantidade_estoque: 0 },
      { id: 'disponivel', nome: 'Geladinho', preco_centavos: 200, quantidade_estoque: 1 },
    ]
    expect(calcularRecomendacaoCardapio({ pessoas: 2, produtos }).itens[0].produto.id).toBe('disponivel')
  })

  it('mantém seguro o catálogo vazio sem orçamento', () => {
    const rec = calcularRecomendacaoCardapio({ pessoas: 4, produtos: [] })
    expect(rec.itens).toEqual([])
    expect(rec.totalCentavos).toBe(0)
    expect(rec.textoExplicativo).not.toMatch(/recomendada é\s*,/i)
  })

  it('informa quando o catálogo está vazio', () => {
    expect(formatarCardapioResumido([])).toMatch(/cardápio.*atualiz/i)
  })

  it('exibe todos os produtos reais sem inventar rendimento ou imagens', () => {
    const texto = formatarCardapioResumido(produtos, 'https://loja.example/')
    for (const produto of produtos) {
      expect(texto).toContain(produto.nome)
      expect(texto).toContain(`product:${produto.id}`)
    }
    expect(texto).toContain('R$ 5,00')
    expect(texto).toContain('Restam 3 un')
    expect(texto).toContain('Serve duas pessoas')
    expect(texto).toContain('https://loja.example/fotos/suco.png')
    expect(texto).toContain('https://example.com/foto.png')
    expect(texto).not.toMatch(/\/cardapio\/combo_|Serve 4 pessoas|churrasco|almoço de domingo/i)
  })

  it('recomenda apenas produto disponível dentro do orçamento, sem prometer rendimento', () => {
    const rec = calcularRecomendacaoCardapio({ pessoas: 4, orcamentoMaximoCentavos: 700, produtos })
    expect(rec.itens[0].produto.id).toBe('doce')
    expect(rec.totalCentavos).toBe(500)
    expect(rec.textoExplicativo).not.toMatch(/melhor opção|serve/i)
  })

  it('não recomenda produto quando catálogo está vazio ou orçamento não permite', () => {
    for (const lista of [[], produtos]) {
      const rec = calcularRecomendacaoCardapio({ pessoas: 2, orcamentoMaximoCentavos: 100, produtos: lista })
      expect(rec.itens).toEqual([])
      expect(rec.totalCentavos).toBe(0)
      expect(rec.textoExplicativo).not.toMatch(/recomendada é\s*,/i)
    }
  })
})
