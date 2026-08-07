// Contatos da loja. Vêm do ambiente em build-time (o bundle é estático), com o
// valor real como padrão — ver VITE_WHATSAPP / VITE_INSTAGRAM no .env.example.
// || e não ??: build sem a env definida injeta string vazia, que precisa cair no padrão
export const WHATSAPP = import.meta.env.VITE_WHATSAPP || "5585985242758";

export const INSTAGRAM =
  import.meta.env.VITE_INSTAGRAM || "https://www.instagram.com/dibie.oficial/";

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP}`;
