import dynamic from 'next/dynamic'

const BuchenClient = dynamic(() => import('./BuchenClient'), { ssr: false })

export default function BuchenPage() {
  return <BuchenClient />
}
