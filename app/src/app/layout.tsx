import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "Control DICA-MX",
  description: "Plataforma de gestión documental segura y auditable",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

const antiFlashScript = `
(function(){try{
  var t=localStorage.getItem('dica-theme');
  if(t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){
    document.documentElement.setAttribute('data-theme','dark');
  }
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
