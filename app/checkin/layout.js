export const metadata = {
  title: 'ImmoPixels Stempeluhr',
  description: 'Check-in & Arbeitszeit',
  manifest: '/checkin-manifest.json',
}
export const viewport = { width:'device-width', initialScale:1, maximumScale:1, userScalable:false, viewportFit:'cover' }

export default function CheckinLayout({ children }){
  return (
    <>
      <link rel="manifest" href="/checkin-manifest.json" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="ImmoPixels" />
      <meta name="theme-color" content="#1f4d3f" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      {children}
    </>
  )
}
