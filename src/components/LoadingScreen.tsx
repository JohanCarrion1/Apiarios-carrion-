import { motion } from 'framer-motion';
import AppLogo, { type AppLogoSize } from './AppLogo';

interface LoadingScreenProps {
  size?: AppLogoSize;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingScreen({
  size = 'lg',
  label = 'Cargando...',
  fullScreen = false,
  className = '',
}: LoadingScreenProps) {
  const body = (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        aria-busy="true"
        animate={{ scale: [1, 1.07, 1], opacity: [0.72, 1, 0.72] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AppLogo size={size} />
      </motion.div>
      {label ? (
        <p className="font-mono text-xs uppercase tracking-wider text-honey">{label}</p>
      ) : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">{body}</div>
    );
  }

  return <div className={className}>{body}</div>;
}