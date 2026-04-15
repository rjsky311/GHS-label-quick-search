const React = require('react');

const useTranslation = () => ({
  t: (key) => key,
  i18n: {
    language: 'en',
    changeLanguage: jest.fn(),
  },
});

// `withTranslation` HOC — used by class components (e.g. ErrorBoundary)
// that can't call the hook directly. Passes `t` and `i18n` as props.
// Uses createElement so class components render correctly.
const withTranslation = () => (Component) => {
  const Wrapped = (props) => {
    const value = useTranslation();
    return React.createElement(Component, { ...value, ...props });
  };
  Wrapped.displayName = `withTranslation(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

module.exports = {
  useTranslation,
  withTranslation,
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  Trans: ({ children }) => children,
};
