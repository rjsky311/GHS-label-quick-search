const useTranslation = () => ({
  t: (key) => key,
  i18n: {
    language: 'en',
    changeLanguage: jest.fn(),
  },
});

module.exports = {
  useTranslation,
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  Trans: ({ children }) => children,
};
