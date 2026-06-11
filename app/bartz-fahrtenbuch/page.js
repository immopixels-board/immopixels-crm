import dynamic from 'next/dynamic'

const BartzFahrtenbuch = dynamic(() => import('./BartzFahrtenbuch'), { ssr: false })

export default function BartzFahrtenbuchPage() {
  return <BartzFahrtenbuch />
}
