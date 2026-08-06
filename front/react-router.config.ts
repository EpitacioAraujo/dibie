import type { Config } from "@react-router/dev/config";

export default {
  // SSG: sem servidor em runtime. As rotas são pré-renderizadas para HTML
  // estático no build e servidas por nginx (igual às gerações anteriores).
  ssr: false,
  prerender: ["/", "/produtos"],
} satisfies Config;
