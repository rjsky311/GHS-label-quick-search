const i18n = {
  language: 'en',
  t: (key) => key,
  changeLanguage: jest.fn(),
  use: jest.fn().mockReturnThis(),
  init: jest.fn(),
};

export default i18n;
