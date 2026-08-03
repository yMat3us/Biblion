import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "android/**/build/**",
    "android/**/.gradle/**",
    "android/app/src/main/assets/public/**",
    "next-env.d.ts",
    // Script de carga do k6: usa o runtime/imports do k6 (k6/http, __ENV), fora
    // do escopo de lint/tsc da aplicação.
    "scripts/*.k6.js",
  ]),
  // Fronteira de módulo (monólito modular): a camada de serviços é o núcleo de
  // domínio e deve permanecer agnóstica de transporte/UI. Não pode depender da
  // camada HTTP (route()), do runtime de rota (next/server) nem de código de app/.
  // As rotas dependem dos serviços, nunca o contrário. A fronteira client/DB é
  // reforçada em build por `server-only` em lib/prisma.ts.
  {
    files: ["lib/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/route",
              message:
                "Serviços não devem depender da camada HTTP (route()). Mantenha-os agnósticos de transporte; a rota chama o serviço.",
            },
          ],
          patterns: [
            {
              group: ["@/app/*", "@/app/**"],
              message: "Serviços não devem importar código de app/ (isso inverteria a dependência).",
            },
            {
              group: ["next/server"],
              message: "Serviços não constroem respostas HTTP; lance ApiErrors e deixe a rota traduzir.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
