import PlaceholderPage from './PlaceholderPage'

export default function AnalyticsPage() {
  return (
    <PlaceholderPage
      eyebrow="Analytics"
      title="Wait-time analytics"
      titleNp="पर्खाइ समय विश्लेषण"
      description="Per-office reporting on peak hours, handling time and abandonment."
      descriptionNp="व्यस्त समय, सेवा अवधि र लाइन छोड्ने दरबारे कार्यालयगत रिपोर्ट।"
      points={[
        'Tokens issued and served per day and per service',
        'Average handling time per counter',
        'Peak hours heat map',
        'Abandonment and no-show rates',
      ]}
    />
  )
}
