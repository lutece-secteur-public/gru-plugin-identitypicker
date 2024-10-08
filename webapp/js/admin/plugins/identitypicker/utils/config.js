export const defaultConfig = {
  choices: {
    minSearchLength: 3,
    debounceTime: 300,
  },
  display: {
    modalMaxHeight: 0.9,
  },
  endpoints: {
    permissions: 'rest/identitystore/api/permissions',
    search: 'rest/identitystore/api/search',
    identity: 'rest/identitystore/api/identity',
    rules: 'rest/identitystore/api/rules',
    history: 'history',
    countries: 'rest/geocodesclient/api/v1/countries',
    cities: 'rest/geocodesclient/api/v1/cities',
  },
  autoFill: false,
  selection:true,
  cuid: null,
  fieldMapping: {},
};