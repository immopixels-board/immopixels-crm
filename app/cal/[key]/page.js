import dynamic from 'next/dynamic'

const CalClient = dynamic(() => import('./CalClient'), { ssr: false })

export default function PublicCalPage({ params }) {
  return <CalClient ckey={params.key} />
}
