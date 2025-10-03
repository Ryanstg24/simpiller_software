import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProviderV2 } from "@/contexts/auth-context-v2";
import { Providers } from "@/components/providers";
import { PasswordChangeWrapper } from "@/components/auth/password-change-wrapper";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simpiller Dashboard",
  description: "Healthcare medication management dashboard for providers and administrators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <AuthProviderV2>
              <PasswordChangeWrapper>
                {children}
              </PasswordChangeWrapper>
            </AuthProviderV2>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
