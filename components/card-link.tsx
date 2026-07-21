import Link from "next/link";

// El link estirado que hace clickeable una card entera (design.md): se coloca
// como primer hijo de un contenedor `relative` y cubre toda su superficie.
// Las acciones internas que deban seguir siendo clickeables se elevan con
// `relative z-[1]`. Único componente para todas las cards navegables.
export function CardLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} aria-label={label} className="absolute inset-0" />;
}
