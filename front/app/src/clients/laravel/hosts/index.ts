// || e não ??: build sem a env definida injeta string vazia, que precisa cair no padrão
export const LARAVEL_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
