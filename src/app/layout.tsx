import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
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
            <AuthProvider>
              <PasswordChangeWrapper>
                {children}
              </PasswordChangeWrapper>
            </AuthProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
