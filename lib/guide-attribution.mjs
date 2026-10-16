const origin = 'https://anotherhouse-guide.vercel.app';

const labels = {
  ja: {
    rooms: 'Another Houseが提供する公式の客室・設備案内です。',
    access: 'Another Houseが提供する公式のアクセス案内です。'
  },
  'zh-CN': {
    rooms: '由 Another House 提供的官方客房与设施指南。',
    access: '由 Another House 提供的官方到店交通指南。'
  },
  'zh-TW': {
    rooms: '由 Another House 提供的官方客房與設備指南。',
    access: '由 Another House 提供的官方抵達交通指南。'
  }
};

export function guideAttribution(language, topic) {
  const label = labels[language]?.[topic];
  if (!label) throw new Error(`Missing guide attribution: ${language}/${topic}`);
  return {
    label,
    reference: {'@id': origin + '/#guide-publisher'},
    publisher: {
      '@type': 'Organization', '@id': origin + '/#guide-publisher',
      name: 'Another House', url: origin + '/'
    }
  };
}
