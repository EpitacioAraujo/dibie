import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Download,
  Eye,
  LogOut,
  Menu,
  Minus,
  MoveHorizontal,
  MoveVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
  type LucideProps,
} from "lucide-react";

/**
 * Vocabulário de ícones da interface, todo em cima do lucide-react. Passa por
 * aqui em vez de cada tela importar da biblioteca para o traço ficar num lugar
 * só — 16px e stroke 1.5 é o peso do texto do sistema.
 */
const styled =
  (Icon: (props: LucideProps) => React.ReactNode) => (props: LucideProps) =>
    <Icon size={16} strokeWidth={1.5} {...props} />;

export const PencilIcon = styled(Pencil);
export const TrashIcon = styled(Trash2);
export const PlusIcon = styled(Plus);
export const MinusIcon = styled(Minus);
export const CloseIcon = styled(X);
export const CheckIcon = styled(Check);
export const DownloadIcon = styled(Download);
export const CameraIcon = styled(Camera);
export const SparklesIcon = styled(Sparkles);
export const ArrowLeftIcon = styled(ArrowLeft);
export const ArrowRightIcon = styled(ArrowRight);
export const LogoutIcon = styled(LogOut);
export const SidebarCloseIcon = styled(PanelLeftClose);
export const SidebarOpenIcon = styled(PanelLeftOpen);
export const MoveHorizontalIcon = styled(MoveHorizontal);
export const MoveVerticalIcon = styled(MoveVertical);
export const EyeIcon = styled(Eye);
export const RetryIcon = styled(RotateCcw);
export const MenuIcon = styled(Menu);
export const CartIcon = styled(ShoppingBag);

// As duas marcas ficam à mão: o lucide não distribui logotipos.
const brand = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type BrandProps = { className?: string; size?: number };

export function InstagramIcon({ className, size = 16 }: BrandProps) {
  return (
    <svg {...brand} width={size} height={size} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon({ className, size = 16 }: BrandProps) {
  return (
    <svg {...brand} width={size} height={size} className={className}>
      <path d="M3.5 20.5l1.3-4a8 8 0 1 1 3 2.9z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-1l-1.4-.7-1 .8a5.6 5.6 0 0 1-2.2-2.2l.8-1L11 9.5c-.5 0-1 .4-1 1z" />
    </svg>
  );
}
