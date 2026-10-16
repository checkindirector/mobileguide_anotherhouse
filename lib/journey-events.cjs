const SOURCES = ['direct_unknown','google','bing','naver','baidu','yahoo','chatgpt','perplexity','claude','gemini','copilot','other_referral'];
const PAGES = ['home','rooms','gallery','access','tours','checkin','other'];
const LANGUAGES = ['ko','en','ja','zh','zh-TW'];
function journeyFields(value) {
  if (!value || value.version !== 1 || !SOURCES.includes(value.source) || !PAGES.includes(value.landingPage) ||
      !PAGES.includes(value.page) || !LANGUAGES.includes(value.landingLanguage) || !Number.isInteger(value.step) || value.step < 1 || value.step > 100000) return null;
  return {version:1, source:value.source, landingPage:value.landingPage, landingLanguage:value.landingLanguage, page:value.page, step:value.step};
}
module.exports = { journeyFields };
