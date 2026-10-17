const origin = 'https://anotherhouse-guide.vercel.app';

// Describe the existing translated cards, without creating a second content source.
export function tourSchema({ tours, language, locale, title, description, lodging }) {
  const url = origin + locale.path;
  const { '@context': ignored, ...lodgingEntity } = lodging;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': url + '#webpage', url,
        name: title, description, inLanguage: locale.htmlLang,
        publisher: { '@type': 'Organization', '@id': origin + '/#guide-publisher', name: 'Another House', url: origin + '/' },
        mainEntity: { '@id': url + '#places' }
      },
      {
        '@type': 'ItemList', '@id': url + '#places',
        name: tours.title[language], numberOfItems: tours.places.length,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        itemListElement: tours.places.map((place, index) => ({
          '@type': 'ListItem', position: index + 1,
          item: {
            '@type': 'Place', name: place.name[language],
            description: place.text[language],
            image: new URL(place.image, origin).href,
            hasMap: place.google
          }
        }))
      },
      lodgingEntity
    ]
  };
}
