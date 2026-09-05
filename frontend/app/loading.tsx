// frontend/app/loading.tsx
import { PageTransitionLoader } from '@/components/PageTransitionLoader';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#030617] flex items-center justify-center">
      <PageTransitionLoader text="AETHERFLOW" />
    </div>
  );
}
