import Logo from './Logo';

export type AppLogoSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<AppLogoSize, string> = {
  sm: 'h-8 w-8 sm:h-9 sm:w-9',
  md: 'h-12 w-12 sm:h-14 sm:w-14',
  lg: 'h-20 w-20 sm:h-24 sm:w-24',
};

export default function AppLogo({
  size = 'md',
  className = '',
}: {
  size?: AppLogoSize;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${SIZE_CLASS[size]} ${className}`}
      aria-hidden="true"
    >
      <Logo variant="icon" className="h-full w-full" />
    </span>
  );
}