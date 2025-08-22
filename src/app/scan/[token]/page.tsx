import { ScanPageClient } from './scan-page-client';

interface ScanPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { token } = await params;
  
  return <ScanPageClient token={token} />;
} 