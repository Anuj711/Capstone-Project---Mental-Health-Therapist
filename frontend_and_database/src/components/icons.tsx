import { BrainCircuit } from 'lucide-react';
import type { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M12 11c-2.8 0-5 2.2-5 5v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2c0-2.8-2.2-5-5-5Z" />
      <path d="M6.5 12.5c0-4.5 4-8.5 4-8.5" />
      <path d="M17.5 12.5c0-4.5-4-8.5-4-8.5" />
      <path d="M12 11V9" />
      <path d="M8 12h-2" />
      <path d="M18 12h-2" />
      <path d="M7 17h-.5" />
      <path d="M17.5 17h-.5" />
      <path d="M14 17h-4" />
    </svg>
  );
}
