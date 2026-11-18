import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Toaster } from "sonner";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { CurrentUserProvider } from "@/app/providers/CurrentUserProvider";
import { MuiProvider } from "@/app/providers/MuiProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { ConfirmProvider, RouteProgress } from "@/components/ops";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CMS",
  description: "Content management",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${onest.variable} min-h-dvh font-sans antialiased`}>
        {/* enableCssLayer puts MUI styles in @layer mui so Tailwind utilities can override them */}
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <MuiProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                <CurrentUserProvider>
                  <ConfirmProvider>
                    <RouteProgress />
                    {children}
                    <Toaster richColors position="top-center" />
                  </ConfirmProvider>
                </CurrentUserProvider>
              </AuthProvider>
            </ThemeProvider>
          </MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
