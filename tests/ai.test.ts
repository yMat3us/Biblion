import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiSdk from 'ai';
import { generateBibleInsights } from '../lib/ai';

vi.mock('ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('ai')>();
  return {
    ...mod,
    generateObject: vi.fn(),
  };
});

describe('AI Pipeline: generateBibleInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run module audit and global audit properly', { timeout: 120000 }, async () => {
    const mockGenerateObject = aiSdk.generateObject as any;
    
    // Mock the responses for modules
    mockGenerateObject.mockImplementation(async (options: any) => {
      const prompt = options.prompt;
      
      // If it's the module auditor
      if (prompt.includes('Auditor Acadêmico de Módulo')) {
        return { object: { approved: true, issues: [] } };
      }
      // If it's the global auditor
      if (prompt.includes('Auditor Acadêmico Independente (Global)')) {
        return { object: { approved: true, issues: [] } };
      }
      
      // It's a module generation
      return { object: { dummy: 'data' } };
    });

    const result = await generateBibleInsights('João 1:1', 'No princípio era o Verbo');
    
    expect(result).toBeDefined();
    
    // Verify that the local and global auditors were called
    const calls = mockGenerateObject.mock.calls.map((call: any) => call[0].prompt);
    
    const moduleAuditCalls = calls.filter((p: string) => p.includes('Auditor Acadêmico de Módulo'));
    expect(moduleAuditCalls.length).toBeGreaterThanOrEqual(8); // 8 modules
    
    const globalAuditCalls = calls.filter((p: string) => p.includes('Auditor Acadêmico Independente (Global)'));
    expect(globalAuditCalls.length).toBeGreaterThanOrEqual(1); // 1 global audit
  });

  it('should retry module generation if module audit fails with LEXICAL_OVERCLAIM', { timeout: 120000 }, async () => {
    const mockGenerateObject = aiSdk.generateObject as any;
    let module1Attempts = 0;

    mockGenerateObject.mockImplementation(async (options: any) => {
      const prompt = options.prompt;
      
      if (prompt.includes('OBJETIVO: MODULO 1')) {
        module1Attempts++;
        return { object: { textoVersiculo: 'Mock' } };
      }

      if (prompt.includes('Auditor Acadêmico de Módulo')) {
        if (module1Attempts === 1 && prompt.includes('Mock')) {
          return {
            object: {
              approved: false,
              issues: [{
                severity: 'HIGH',
                type: 'LEXICAL_OVERCLAIM',
                problem: 'Hyper-semantization detected',
                correctionInstruction: 'Do not claim anarthrous noun always means qualitative.'
              }]
            }
          };
        }
        return { object: { approved: true, issues: [] } };
      }
      
      if (prompt.includes('Auditor Acadêmico Independente (Global)')) {
        return { object: { approved: true, issues: [] } };
      }

      return { object: { dummy: 'data' } };
    });

    await generateBibleInsights('João 1:1', 'No princípio era o Verbo');
    
    // Module 1 should be attempted twice
    expect(module1Attempts).toBe(2);
  });
});
