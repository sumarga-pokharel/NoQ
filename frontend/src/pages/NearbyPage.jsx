import PlaceholderPage from './PlaceholderPage'

export default function NearbyPage() {
  return (
    <PlaceholderPage
      eyebrow="Nearby"
      title="Offices near you"
      titleNp="तपाईं नजिकका कार्यालय"
      description="Map of listed offices with distance and travel time from your current location."
      descriptionNp="तपाईंको हालको स्थानबाट दूरी र यात्रा समयसहित कार्यालयहरूको नक्सा।"
      points={[
        'Map pins for every office in the directory',
        'Distance and travel time from the visitor location',
        'Filter by sector and by open/paused status',
        'Jump straight into a service queue from a pin',
      ]}
    />
  )
}
