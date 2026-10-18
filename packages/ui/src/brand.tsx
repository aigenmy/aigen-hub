// The AIGen logo (same file as aigen.my: aigen-next/assets/img/aigen-logo.png, copied to apps/web/public).
export function HubMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/aigen-logo.png" width={size} height={size} alt="" className="shrink-0" style={{ width: size, height: size }} />
  );
}

export function HubLogo({ size = 28, label = 'AIGen Hub' }: { size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <HubMark size={size} />
      <span className="text-md font-semibold tracking-tight text-text">{label}</span>
    </span>
  );
}
