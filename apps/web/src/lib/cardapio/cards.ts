export interface CartaoCombo {
  id: string
  numeroCombo: number
  nome: string
  slogan: string
  rendimento: string
  precoCentavos: number
  precoFormatado: string
  cmvEstimado: string
  itensComposicao: string[]
  modoPreparo: string
  destaqueBadge: string
  urlImagemPrincipal: string
  urlImagemSecundaria: string
  textoMarkdownCartao: string
}

// Mantido para compatibilidade; o catálogo deve vir dos produtos cadastrados.
export const COMBOS_OFICIAIS: CartaoCombo[] = []

export function obterCartoesCombosOficiais(): CartaoCombo[] {
  return COMBOS_OFICIAIS
}

export function obterCartaoCombo(identificador: number | string): CartaoCombo | undefined {
  if (typeof identificador === 'number') {
    return COMBOS_OFICIAIS.find((c) => c.numeroCombo === identificador)
  }
  const termo = identificador.toLowerCase()
  return COMBOS_OFICIAIS.find((c) => c.id === identificador || c.nome.toLowerCase().includes(termo))
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function gerarCatalogoTextoCompleto(appUrl = 'https://crmsofiamanager.duckdns.org'): string {
  if (COMBOS_OFICIAIS.length === 0) {
    return 'No momento nosso cardápio está sendo atualizado. Por favor, pergunte a um atendente!'
  }
  return COMBOS_OFICIAIS.map((c) => c.textoMarkdownCartao).join('\n\n')
}

export const gerarCatalogoCardsCompleto = gerarCatalogoTextoCompleto
