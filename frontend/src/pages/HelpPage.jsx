import PlaceholderPage from './PlaceholderPage'

export default function HelpPage() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="How NoQ works"
      titleNp="NoQ कसरी काम गर्छ"
      description="A step-by-step guide for visitors and counter staff, in English and Nepali."
      descriptionNp="भ्रमणकर्ता र काउन्टर कर्मचारीका लागि चरणबद्ध निर्देशिका, अंग्रेजी र नेपालीमा।"
      points={[
        'Scanning a QR and reading the token screen',
        'What the estimate range means and why it moves',
        'Turning on browser alerts or SMS reminders',
        'Holding your place and rejoining after a no-show',
      ]}
    />
  )
}
