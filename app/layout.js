export const dynamic = 'force-dynamic'
export const revalidate = 0
import './globals.css'
import Script from 'next/script'
export const metadata = { title: 'ImmoPixels CRM', description: 'ImmoPixels Board & CRM' }
export default function RootLayout({ children }) {
  const isDemo = process.env.NEXT_PUBLIC_IS_DEMO === '1'
  return (
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body>
        {isDemo && (
          <Script id="smartlook" strategy="afterInteractive">{`
            window.smartlook||(function(d) {
              var o=smartlook=function(){ o.api.push(arguments)},h=d.getElementsByTagName('head')[0];
              var c=d.createElement('script');o.api=new Array();c.async=true;c.type='text/javascript';
              c.charset='utf-8';c.src='https://web-sdk.smartlook.com/recorder.js';h.appendChild(c);
            })(document);
            smartlook('init', '19b29175d8fd98746b183f875e483784eceb619c', { region: 'eu' });
          `}</Script>
        )}
        {children}
      </body>
    </html>
  )
}
