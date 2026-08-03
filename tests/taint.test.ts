import { describe, expect, it } from 'vitest'
import { initServerTaint, taintObject, taintValue } from '@/lib/taint'

// Em React estável (ambiente de teste) as APIs experimentais de taint não
// existem. Os helpers devem virar no-op em vez de quebrar — garante que ativar
// o flag não introduz um ponto de falha quando o runtime não o suporta.
describe('taint helpers — degradam para no-op sem a API experimental', () => {
  it('não lançam ao marcar objetos', () => {
    expect(() => taintObject('não vaze', { secret: 'x' })).not.toThrow()
  })

  it('não lançam ao marcar valores (inclusive vazios)', () => {
    expect(() => taintValue('não vaze', {}, 'segredo')).not.toThrow()
    expect(() => taintValue('não vaze', {}, '')).not.toThrow()
  })

  it('initServerTaint é idempotente e seguro', () => {
    expect(() => {
      initServerTaint()
      initServerTaint()
    }).not.toThrow()
  })
})
